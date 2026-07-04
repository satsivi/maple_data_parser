/**
 * maple-event-optimizer.js
 *
 * Pure logic, no DOM. Given a set of event stat lines (see
 * maple-constants/event-configs.json for the schema), an FD weight per line
 * (keyed by line name — index.html seeds each line's weight from
 * maple-parser.js's parse() output, summing whichever stat keys the line
 * maps to, but the user can hand-edit any of them), an optional set of
 * reserved level counts per line, and a week-by-week currency income array,
 * computes which levels to buy to maximize total FD gain by the end of the
 * event, plus a week-by-week purchase schedule that respects per-line level
 * ordering and cumulative currency availability.
 *
 * Primary export: optimizeEvent(lines, weights, budget)
 * Also exported: computeWeeklyIncome(...) for building the incomeByWeek
 * array from a per-claim + per-week-claim-cap + lifetime-claim-cap +
 * recurring-weekly-bonus income model (the shape most MapleStory events
 * actually use — e.g. "5 points per claim, up to 5 claims a week, 60
 * claims total across the event").
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Walk a line's levels and compute the marginal stat gained at each level
 * (levels store cumulative stat value, not a delta).
 *
 * @param {{ name: string, levels: Array<{level:number, cost:number, value:number}> }} line
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
 * A line missing from `weights` is treated as contributing 0 FD per unit
 * rather than throwing — this lets callers include lines the parser can't
 * derive a weight for (e.g. Critical Rate, which only matters for some
 * classes) and simply leave them at 0 unless the user fills in a value by
 * hand.
 *
 * @param {Array<{ name: string, levels: Array<{level:number, cost:number, value:number}> }>} lines
 * @param {Record<string, number>} weights - FD weight per unit, keyed by line name
 * @param {number} totalBudget - integer currency budget
 * @param {Record<string, number>} [reservedLevels] - line name -> minimum number of levels that must be bought
 * @returns {{
 *   totalFd: number,
 *   chosenLevels: Record<string, number>,   // line name -> number of levels bought
 *   linePrefixes: Record<string, Array<{cost:number, fd:number}>>,
 *   lineSteps: Record<string, Array<{level:number, cost:number, statGain:number}>>,
 * }}
 * @throws {Error} if reserved levels alone cost more than totalBudget
 */
export function optimizeAllocation(lines, weights, totalBudget, reservedLevels = {}) {
  const budget = Math.floor(totalBudget);

  const linePrefixes = {};
  const lineSteps = {};
  const minK = {};

  let reservedCost = 0;
  for (const line of lines) {
    const fdPerUnit = weights[line.name] ?? 0;
    const steps = computeMarginalSteps(line);
    lineSteps[line.name] = steps;
    const prefixes = buildPrefixSums(steps, fdPerUnit);
    linePrefixes[line.name] = prefixes;

    const reserved = Math.min(reservedLevels[line.name] ?? 0, steps.length);
    minK[line.name] = reserved;
    reservedCost += prefixes[reserved].cost;
  }

  if (reservedCost > budget) {
    throw new Error(
      `Reserved levels cost ${reservedCost}, which exceeds the total budget of ${budget}.`
    );
  }

  // dp[c] = max total FD achievable with exactly budget c spent so far
  let dp = new Array(budget + 1).fill(0);

  // Track, for each line processed, which prefix length was chosen at each
  // capacity so we can reconstruct the final allocation.
  const choiceHistory = []; // choiceHistory[lineIdx][c] = chosen k

  for (const line of lines) {
    const prefixes = linePrefixes[line.name];
    const startK = minK[line.name];
    const nextDp = new Array(budget + 1).fill(-Infinity);
    const choices = new Array(budget + 1).fill(startK);

    for (let c = 0; c <= budget; c++) {
      let best = -Infinity;
      let bestK = startK;
      for (let k = startK; k < prefixes.length; k++) {
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

  // Find the best capacity among those that are actually reachable (a
  // reachable capacity has a finite dp value; capacities too small to cover
  // every line's reserved levels stay -Infinity).
  let bestCapacity = -1;
  for (let c = 0; c <= budget; c++) {
    if (dp[c] > -Infinity && (bestCapacity === -1 || dp[c] >= dp[bestCapacity])) {
      bestCapacity = c;
    }
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
 * week adds that week's income to a running balance and greedily buys any
 * affordable selected step, respecting that a line's levels must be bought
 * in order.
 *
 * @param {Array<{ name: string }>} lines
 * @param {Record<string, number>} chosenLevels - line name -> levels bought
 * @param {Record<string, Array<{level:number, cost:number, statGain:number}>>} lineSteps
 * @param {Record<string, number>} weights - FD weight per unit, keyed by line name
 * @param {{ incomeByWeek: number[] }} budget
 * @returns {{ weeks: Array<{ week: number, purchases: Array<{line:string, level:number, cost:number, fdGain:number}>, balance: number }>, totalFdGained: number }}
 */
export function buildWeeklySchedule(lines, chosenLevels, lineSteps, weights, budget) {
  const { incomeByWeek } = budget;

  // Flatten selected steps, keeping per-line order via a pointer per line.
  const remainingByLine = {};
  for (const line of lines) {
    const count = chosenLevels[line.name] || 0;
    const fdPerUnit = weights[line.name] ?? 0;
    remainingByLine[line.name] = lineSteps[line.name]
      .slice(0, count)
      .map((step) => ({
        line: line.name,
        level: step.level,
        cost: step.cost,
        fdGain: step.statGain * fdPerUnit,
        ratio: step.cost > 0 ? (step.statGain * fdPerUnit) / step.cost : Infinity,
      }));
  }

  // Priority queue substitute: at each purchase decision, look at the head
  // (next unbought level) of every line, and buy the best-ratio affordable one.
  let balance = 0;
  const weeks = [];
  let totalFdGained = 0;

  for (let i = 0; i < incomeByWeek.length; i++) {
    const week = i + 1;
    balance += incomeByWeek[i];

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
// Income model
// ---------------------------------------------------------------------------

/**
 * Build a week-by-week income array for the common MapleStory event income
 * shape: a fixed-size claim (e.g. "5 points") claimable up to a limited
 * number of times per week, capped by a lifetime total number of claims
 * across the whole event, plus a recurring bonus (e.g. a cash-shop
 * purchase) added every week regardless of the lifetime cap.
 *
 * @param {{
 *   pointsPerClaim: number,      // points granted per claim (e.g. 5)
 *   maxClaimsPerWeek: number,    // claims allowed per week (e.g. 5, for 25 pts/week)
 *   maxLifetimeClaims: number,   // total claims allowed across the whole event (e.g. 60)
 *   weeklyBonusPoints?: number,  // extra points added every week regardless of the lifetime cap
 *   numWeeks: number,
 * }} params
 * @returns {number[]} incomeByWeek, length numWeeks
 */
export function computeWeeklyIncome({
  pointsPerClaim,
  maxClaimsPerWeek,
  maxLifetimeClaims,
  weeklyBonusPoints = 0,
  numWeeks,
}) {
  const incomeByWeek = [];
  let claimsSoFar = 0;

  for (let week = 1; week <= numWeeks; week++) {
    const claimsThisWeek = Math.max(0, Math.min(maxClaimsPerWeek, maxLifetimeClaims - claimsSoFar));
    claimsSoFar += claimsThisWeek;
    incomeByWeek.push(claimsThisWeek * pointsPerClaim + weeklyBonusPoints);
  }

  return incomeByWeek;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the optimal event-stat purchase schedule.
 *
 * @param {Array<{ name: string, levels: Array<{level:number, cost:number, value:number}> }>} lines
 * @param {Record<string, number>} weights - FD weight per unit, keyed by line name
 * @param {{ incomeByWeek: number[], reservedLevels?: Record<string, number> }} budget
 * @returns {{
 *   weeks: Array<{ week: number, purchases: Array<{line:string, level:number, cost:number, fdGain:number}>, balance: number }>,
 *   totalFdGained: number,
 *   chosenLevels: Record<string, number>,
 * }}
 */
export function optimizeEvent(lines, weights, budget) {
  const { incomeByWeek, reservedLevels = {} } = budget;
  const totalBudget = incomeByWeek.reduce((sum, income) => sum + income, 0);

  const { chosenLevels, lineSteps } = optimizeAllocation(lines, weights, totalBudget, reservedLevels);
  const schedule = buildWeeklySchedule(lines, chosenLevels, lineSteps, weights, { incomeByWeek });

  return { ...schedule, chosenLevels };
}
