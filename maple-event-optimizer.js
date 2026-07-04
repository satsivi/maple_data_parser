/**
 * maple-event-optimizer.js
 *
 * Pure logic, no DOM. Given a set of event stat lines (see
 * maple-event-constants.js for the schema), the FD weights produced by
 * maple-parser.js's parse(), and a currency budget shape (weekly income,
 * number of weeks, an optional one-time bonus landing in a specific week),
 * computes which levels to buy to maximize total FD gain by the end of the
 * event, and a week-by-week purchase schedule that respects per-line level
 * ordering and cumulative currency availability.
 *
 * Primary export: optimizeEvent(lines, weights, budget)
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Walk a line's levels and compute the marginal stat gained at each level
 * (levels store cumulative stat value, not a delta).
 *
 * @param {{ name: string, statKey: string, levels: Array<{level:number, cost:number, value:number}> }} line
 * @returns {Array<{ level: number, cost: number, statGain: number }>}
 */
export function computeMarginalSteps(line) {
  const sorted = [...line.levels].sort((a, b) => a.level - b.level);
  let prevValue = 0;
  return sorted.map((lv) => {
    const statGain = lv.value - prevValue;
    prevValue = lv.value;
    return { level: lv.level, cost: lv.cost, statGain };
  });
}

/**
 * Build cumulative (cost, fd) prefix sums for buying the first k levels of a
 * line, for k = 0..levels.length. Index 0 is always { cost: 0, fd: 0 }.
 *
 * @param {Array<{ level: number, cost: number, statGain: number }>} steps
 * @param {number} fdPerUnit
 * @returns {Array<{ cost: number, fd: number }>}
 */
function buildPrefixSums(steps, fdPerUnit) {
  const prefixes = [{ cost: 0, fd: 0 }];
  for (const step of steps) {
    const prev = prefixes[prefixes.length - 1];
    prefixes.push({
      cost: prev.cost + step.cost,
      fd: prev.fd + step.statGain * fdPerUnit,
    });
  }
  return prefixes;
}

// ---------------------------------------------------------------------------
// Allocation (grouped / multiple-choice knapsack)
// ---------------------------------------------------------------------------

/**
 * Choose how many levels to buy per line to maximize total FD gain subject
 * to a total currency budget. Each line's levels must be bought in order
 * (you can't skip level 2 to buy level 3), so each line contributes one
 * "prefix length" choice — this is a grouped / multiple-choice knapsack.
 *
 * @param {Array<{ name: string, statKey: string, levels: Array<{level:number, cost:number, value:number}> }>} lines
 * @param {Record<string, number>} weights - FD weights, e.g. from parse().weights
 * @param {number} totalBudget - integer currency budget
 * @returns {{
 *   totalFd: number,
 *   chosenLevels: Record<string, number>,   // line name -> number of levels bought
 *   linePrefixes: Record<string, Array<{cost:number, fd:number}>>,
 *   lineSteps: Record<string, Array<{level:number, cost:number, statGain:number}>>,
 * }}
 * @throws {Error} if a line's statKey is not present in weights
 */
export function optimizeAllocation(lines, weights, totalBudget) {
  const budget = Math.floor(totalBudget);

  const linePrefixes = {};
  const lineSteps = {};

  for (const line of lines) {
    if (!(line.statKey in weights)) {
      throw new Error(
        `No FD weight found for stat "${line.statKey}" (line "${line.name}"). ` +
        `Parse a stat table that includes this stat first.`
      );
    }
    const steps = computeMarginalSteps(line);
    lineSteps[line.name] = steps;
    linePrefixes[line.name] = buildPrefixSums(steps, weights[line.statKey]);
  }

  // dp[c] = max total FD achievable with exactly budget c spent so far
  let dp = new Array(budget + 1).fill(0);

  // Track, for each line processed, which prefix length was chosen at each
  // capacity so we can reconstruct the final allocation.
  const choiceHistory = []; // choiceHistory[lineIdx][c] = chosen k

  for (const line of lines) {
    const prefixes = linePrefixes[line.name];
    const nextDp = new Array(budget + 1).fill(-Infinity);
    const choices = new Array(budget + 1).fill(0);

    for (let c = 0; c <= budget; c++) {
      let best = -Infinity;
      let bestK = 0;
      for (let k = 0; k < prefixes.length; k++) {
        const { cost, fd } = prefixes[k];
        if (cost > c) break; // prefixes sorted by increasing cost
        const candidate = dp[c - cost] + fd;
        if (candidate > best) {
          best = candidate;
          bestK = k;
        }
      }
      nextDp[c] = best;
      choices[c] = bestK;
    }

    dp = nextDp;
    choiceHistory.push(choices);
  }

  // Find the best capacity (spending less than the full budget can never
  // beat spending more, but dp is monotonic non-decreasing in c anyway).
  let bestCapacity = 0;
  for (let c = 0; c <= budget; c++) {
    if (dp[c] >= dp[bestCapacity]) bestCapacity = c;
  }

  // Reconstruct chosen level counts per line by walking choiceHistory backwards.
  const chosenLevels = {};
  let remaining = bestCapacity;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const k = choiceHistory[i][remaining];
    chosenLevels[line.name] = k;
    remaining -= linePrefixes[line.name][k].cost;
  }

  return {
    totalFd: dp[bestCapacity],
    chosenLevels,
    linePrefixes,
    lineSteps,
  };
}

// ---------------------------------------------------------------------------
// Weekly schedule
// ---------------------------------------------------------------------------

/**
 * Turn a chosen allocation into a concrete week-by-week purchase order.
 * Selected steps are sorted by FD-per-cost ratio (best value first); each
 * week adds income to a running balance and greedily buys any affordable
 * selected step, respecting that a line's levels must be bought in order.
 *
 * @param {Array<{ name: string, statKey: string }>} lines
 * @param {Record<string, number>} chosenLevels - line name -> levels bought
 * @param {Record<string, Array<{level:number, cost:number, statGain:number}>>} lineSteps
 * @param {Record<string, number>} weights
 * @param {{ weeklyIncome: number, numWeeks: number, bonusPoints?: number, bonusWeek?: number }} budget
 * @returns {{ weeks: Array<{ week: number, purchases: Array<{line:string, level:number, cost:number, fdGain:number}>, balance: number }>, totalFdGained: number }}
 */
export function buildWeeklySchedule(lines, chosenLevels, lineSteps, weights, budget) {
  const { weeklyIncome, numWeeks, bonusPoints = 0, bonusWeek = null } = budget;

  // Flatten selected steps, keeping per-line order via a pointer per line.
  const remainingByLine = {};
  for (const line of lines) {
    const count = chosenLevels[line.name] || 0;
    remainingByLine[line.name] = lineSteps[line.name]
      .slice(0, count)
      .map((step) => ({
        line: line.name,
        level: step.level,
        cost: step.cost,
        fdGain: step.statGain * weights[line.statKey],
        ratio: step.cost > 0 ? (step.statGain * weights[line.statKey]) / step.cost : Infinity,
      }));
  }

  // Priority queue substitute: at each purchase decision, look at the head
  // (next unbought level) of every line, and buy the best-ratio affordable one.
  let balance = 0;
  const weeks = [];
  let totalFdGained = 0;

  for (let week = 1; week <= numWeeks; week++) {
    balance += weeklyIncome;
    if (bonusWeek !== null && week === bonusWeek) balance += bonusPoints;

    const purchases = [];
    // Keep buying while something affordable remains.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let bestLine = null;
      let bestStep = null;
      for (const line of lines) {
        const queue = remainingByLine[line.name];
        if (!queue.length) continue;
        const head = queue[0];
        if (head.cost > balance) continue;
        if (!bestStep || head.ratio > bestStep.ratio) {
          bestLine = line.name;
          bestStep = head;
        }
      }
      if (!bestStep) break;
      remainingByLine[bestLine].shift();
      balance -= bestStep.cost;
      totalFdGained += bestStep.fdGain;
      purchases.push({
        line: bestStep.line,
        level: bestStep.level,
        cost: bestStep.cost,
        fdGain: bestStep.fdGain,
      });
    }

    weeks.push({ week, purchases, balance });
  }

  return { weeks, totalFdGained };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the optimal event-stat purchase schedule.
 *
 * @param {Array<{ name: string, statKey: string, levels: Array<{level:number, cost:number, value:number}> }>} lines
 * @param {Record<string, number>} weights - FD weights, e.g. from parse().weights
 * @param {{ weeklyIncome: number, numWeeks: number, bonusPoints?: number, bonusWeek?: number }} budget
 * @returns {{
 *   weeks: Array<{ week: number, purchases: Array<{line:string, level:number, cost:number, fdGain:number}>, balance: number }>,
 *   totalFdGained: number,
 *   chosenLevels: Record<string, number>,
 * }}
 */
export function optimizeEvent(lines, weights, budget) {
  const { weeklyIncome, numWeeks, bonusPoints = 0 } = budget;
  const totalBudget = weeklyIncome * numWeeks + bonusPoints;

  const { chosenLevels, lineSteps } = optimizeAllocation(lines, weights, totalBudget);
  const schedule = buildWeeklySchedule(lines, chosenLevels, lineSteps, weights, budget);

  return { ...schedule, chosenLevels };
}
