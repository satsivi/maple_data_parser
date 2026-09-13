/**
 * maple-potential-calc.js
 *
 * Pure logic, no DOM. Expected-value calculator for MapleStory's potential
 * cube system: given a cube type (Glowing Cube or Bright Cube — the only two
 * covered) and a grade, estimates how many cube uses (and how many mesos) it
 * takes on average to land any one of several target "option sets" on an
 * item of a given item level and equipment category.
 *
 * Per-slot grade-match ("prime line") rates are sourced from Nexon's
 * official per-item probability disclosure pages
 * (maplestory.nexon.com/Guide/OtherProbability/cube/*), hardcoded in
 * maple-constants/potential-cubes.json — cross-checked against the GMS-side
 * numbers in the StrategyWiki Potential System page, which match exactly
 * (this specific mechanic is shared between regions). Both cubes are
 * cash-shop/drop items with no fixed meso price, so the caller supplies a
 * manual cost per cube (see resetCost).
 *
 * Option-line data (maple-constants/potential-lines.json) is a deliberate
 * HYBRID of two sources — verified to reproduce mesu.live's own numbers
 * exactly (see CLAUDE.md's Potential Calculator section for the full
 * provenance and the reasoning behind the split):
 *   - Pool membership and per-line probability ("rates") come from Nexon's
 *     live KMS probability-search tool — the current, actually-in-game pool,
 *     which sometimes runs ahead of what the (community-maintained, English)
 *     StrategyWiki page documents for GMS.
 *   - The numeric VALUE of a line that scales continuously with item level
 *     (STR/DEX/INT/LUK, All Stats, Weapon ATT, Magic ATT, Max HP/MP — flat
 *     and %) comes from StrategyWiki's GMS-specific value tables instead,
 *     since GMS's own brackets/values for these can exceed KMS's at a given
 *     item level (e.g. GMS's "151+" tier already grants 13% DEX where KMS's
 *     own bracket at the same level still shows 12%) — this is `source:
 *     "wiki-value"` on a line.
 *   - Everything else (discrete named tiers like Boss Damage/Ignore DEF/
 *     Critical Rate/Cooldown, and flavor/proc lines) uses KMS's pool AND
 *     KMS's own value directly (`source: "kms"`), including any tier KMS
 *     has that the wiki hasn't documented (e.g. a Boss Damage +45% KMS
 *     already has, grouped into the existing family by the same
 *     shape-diffing the original KMS-only build used).
 *
 * Matches mesu.live's UX for this feature (independently implemented — see
 * the provenance note in CLAUDE.md): the target isn't a single line, but any
 * number of "option sets", each up to 3 lines (an item only has 3 potential
 * slots) that must ALL appear together — and the tool reports the chance of
 * landing ANY one of those sets (an OR across sets, an AND within a set).
 * E.g. "30 Attack% ALONE, or 23 Attack% + 40 Boss Damage% together" is two
 * option sets.
 *
 * "At least this good" targeting is a SUM, not a single-line minimum: a
 * target of "Attack % >= 30" is satisfied by any real combination of the
 * item's (up to 3) Attack%-family lines that adds up to 30 or more — e.g.
 * 12+9+9, or a single 12+12+6, or one line alone if this cube/category/grade
 * ever offers a single tier that high. There's no need to enumerate which
 * split of tiers to aim for: computeOptionSetsHitPlan brute-forces every
 * real (slot1 line, slot2 line, slot3 line) combination (cheap, since each
 * slot only has a few dozen possible lines) and sums each combination's
 * contribution to every family a target cares about, so whichever real
 * tier-split reaches the target is counted automatically.
 *
 * Item level matters twice: it resolves which value bracket a line's numeric
 * value falls into (maple-constants/potential-lines.json's `valueRows`, with
 * GMS-specific override rows taking priority — see resolveLineValue), and it
 * gates whether a line is in the pool at all (`minLevel`). It's the item's
 * own level, not the character's — same as the reset cost formula.
 *
 * Each of the 3 slots independently rolls "prime" (matches the target grade)
 * with probability cube.slotGradeMatch[slotN] — slot1 always does — or
 * "non-prime" otherwise, which draws from the pool one grade below (a real,
 * smaller-valued line, not a blank slot). See buildSlotRows.
 *
 * "All Stat" lines count toward STR/DEX/INT/LUK sums one-directionally
 * (STAT_ALL_LINKS below) — an "All Stats +9%" roll contributes 9 toward a
 * "STR %" target (it raises STR too), but a plain "STR +12%" roll
 * contributes nothing toward an "All Stats" target.
 *
 * Grade-up (rolling a higher potential tier) is intentionally not modeled —
 * published grade-up rates for KMS don't carry over to GMS, where this
 * tool's numbers are meant to apply, and a reliable GMS-specific source
 * wasn't available when option-line targeting (this tool's actual scope)
 * was built.
 *
 * Primary exports: resetCost, computeOptionSetsHitPlan, listFamilies,
 * familyDisplayName
 */

/**
 * One-directional links: a roll of the linked "All Stats" family also
 * satisfies a target on the individual stat (STR/DEX/INT/LUK), since an All
 * Stat bonus raises all four — but not the reverse (a plain STR roll doesn't
 * raise DEX/INT/LUK, so it can't satisfy an "All Stats" target).
 */
const STAT_ALL_LINKS = {
  "STR Increase": "All Stats Increase",
  "DEX Increase": "All Stats Increase",
  "INT Increase": "All Stats Increase",
  "LUK Increase": "All Stats Increase",
  "STR % Increase": "All Stats % Increase",
  "DEX % Increase": "All Stats % Increase",
  "INT % Increase": "All Stats % Increase",
  "LUK % Increase": "All Stats % Increase",
};

export const GRADE_ORDER = ["RARE", "EPIC", "UNIQUE", "LEGENDARY"];

/**
 * Expected number of attempts to get a first success, given a per-attempt
 * success probability `p` (a plain geometric distribution — no pity/guarantee
 * mechanic applies to option-line hunting).
 *
 * @param {number} p - per-attempt success probability, 0 < p <= 1
 * @returns {number}
 */
export function expectedAttempts(p) {
  if (p <= 0) throw new Error("Success probability must be greater than 0.");
  return 1 / p;
}

/**
 * Meso cost of a single use of `cube` — both covered cubes are cash-shop
 * items with no fixed formula, so this is always the caller-supplied cost
 * per cube (see the "Cube Sale" toggle in index.html for a 25% discount).
 *
 * @param {object} cube - an entry from maple-constants/potential-cubes.json
 * @param {number} manualCost
 */
export function resetCost(cube, manualCost) {
  return Number(manualCost) || 0;
}

/**
 * Resolves a potential line's actual numeric value at a given item level, or
 * null if the line isn't in the pool at all at that level (below its
 * `minLevel` gate). Lines without a level-scaled table (`fixedValue` set)
 * always resolve to that constant. GMS-specific override rows (`gms: true`)
 * take priority over the general row for the same item level.
 *
 * @param {object} line - an entry from maple-constants/potential-lines.json
 * @param {number} itemLevel
 * @returns {number|null}
 */
export function resolveLineValue(line, itemLevel) {
  if (itemLevel < line.minLevel) return null;
  if (line.fixedValue !== null && line.fixedValue !== undefined) return line.fixedValue;
  if (!line.valueRows) return null;
  const inRange = (r) => itemLevel >= r.min && (r.max == null || itemLevel <= r.max);
  const gmsRows = line.valueRows.filter((r) => r.gms && inRange(r));
  if (gmsRows.length) return Math.max(...gmsRows.map((r) => r.value));
  const rows = line.valueRows.filter((r) => !r.gms && inRange(r));
  return rows.length ? rows[0].value : null;
}

/**
 * Builds the 3 independent per-slot line pools for `grade` at `itemLevel`:
 * each slot mixes the "prime" pool (weight cube.slotGradeMatch[slotN]) and
 * the "non-prime" pool (the remaining weight), with every line's value
 * already resolved for `itemLevel` and unavailable lines dropped.
 *
 * @param {object} categoryData - POTENTIAL_LINES[category]
 * @param {string} grade
 * @param {number} itemLevel
 * @param {object} cube
 * @returns {[Array<{family, value, prob}>, Array, Array]}
 */
function buildSlotRows(categoryData, grade, itemLevel, cube) {
  const gradeData = categoryData?.grades?.[grade];
  if (!gradeData) throw new Error(`No potential data for this category at ${grade}.`);

  const resolvePool = (lines, poolWeight) =>
    lines
      .map((line) => ({ name: line.name, family: line.family, value: resolveLineValue(line, itemLevel), prob: (line.cashPct / 100) * poolWeight }))
      .filter((r) => r.value !== null && r.prob > 0);

  return ["slot1", "slot2", "slot3"].map((slot) => {
    const primeWeight = cube.slotGradeMatch[slot];
    return [...resolvePool(gradeData.prime, primeWeight), ...resolvePool(gradeData.nonPrime, 1 - primeWeight)];
  });
}

/**
 * All distinct line "families" available at `grade`/`itemLevel` for
 * `category` — the choices to offer in a "target this family at least this
 * good" UI, each with the highest single-line value seen (a hint for the
 * value input, not a hard cap — targets are sums across all 3 slots, so a
 * user-typed value above this hint can still be reachable via multiple lines).
 *
 * @param {object} categoryData - POTENTIAL_LINES[category]
 * @param {string} grade
 * @param {number} itemLevel
 * @param {object} cube
 * @returns {Array<{family:string, maxValue:number}>}
 */
export function listFamilies(categoryData, grade, itemLevel, cube) {
  let slotRows;
  try {
    slotRows = buildSlotRows(categoryData, grade, itemLevel, cube);
  } catch {
    return [];
  }
  const maxValueByFamily = new Map();
  for (const rows of slotRows) {
    for (const { family, value } of rows) {
      const prev = maxValueByFamily.get(family) ?? -Infinity;
      if (value > prev) maxValueByFamily.set(family, value);
    }
  }
  return Array.from(maxValueByFamily, ([family, maxValue]) => ({ family, maxValue }))
    .sort((a, b) => a.family.localeCompare(b.family));
}

/**
 * A readable label for a family key, e.g. "STR % Increase" -> "STR %",
 * "Attack to Boss Monsters +{N}%" -> "Attack to Boss Monsters %". Families
 * with no "Increase"/numeric placeholder (a flavor line) are returned as-is.
 *
 * @param {string} family
 * @returns {string}
 */
export function familyDisplayName(family) {
  return family
    .replace(/ % Increase$/, " %")
    .replace(/ Increase$/, "")
    .replace(/ \+\{N\}%/g, " %")
    .replace(/ \+\{N\}/g, "")
    .replace(/\{N\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Exact expected-value calculation for landing any one of several "option
 * sets" — each set is 1-3 target lines that must ALL be reached together on
 * the item (an item only has 3 potential slots) — using GMS per-line
 * probabilities and values (maple-constants/potential-lines.json) resolved
 * for the item's own level, together with the cube's per-slot grade-match
 * ("prime line") rate.
 *
 * Each target in a set is a SUM, not a single-line minimum — see the SUM
 * targeting note at the top of this file. Two rows in the same set for the
 * same family are additive (13 + 13 + 10 Attack% in one set means a combined
 * 36 Attack%, not the same target checked three times), collapsed before
 * anything else runs. Brute-forces every real (slot1,
 * slot2, slot3) line combination, summing each combination's contribution
 * to every family any target cares about (an All Stat roll contributes to
 * STR/DEX/INT/LUK sums too), and checks whether the combination reaches
 * every target in any one set.
 *
 * @param {object} params
 * @param {object} params.cube
 * @param {object} params.categoryData - POTENTIAL_LINES[category]
 * @param {string} params.grade
 * @param {Array<Array<{family:string, minValue:number}>>} params.optionSets - 1+ sets, each with 1-3 targets
 * @param {number} params.itemLevel
 * @param {number} [params.manualCost]
 * @returns {{ probPerAttempt:number, expectedAttempts:number, costPerAttempt:number, expectedCost:number, perSet: Array<{targets:Array<{family:string,minValue:number}>, probAlone:number}>, combinations: Array<{lines:string[], prob:number}> }}
 */
export function computeOptionSetsHitPlan({ cube, categoryData, grade, optionSets, itemLevel, manualCost }) {
  if (!cube.slotGradeMatch) throw new Error(`${cube.label} doesn't have real option-line data.`);
  const rawSets = (optionSets || []).filter((s) => s && s.length > 0);
  if (rawSets.length === 0) throw new Error("Add at least one target line.");
  for (const s of rawSets) {
    if (s.length > 3) throw new Error("An item only has 3 potential slots — pick at most 3 lines per option set.");
  }

  // Two rows in the same set targeting the same family are additive, not
  // redundant — "Attack % >= 13" + "Attack % >= 13" + "Attack % >= 10" in one
  // set means the user wants 36 Attack% total (however split across slots),
  // not the same family checked three times against three thresholds.
  const sets = rawSets.map((set) => {
    const totals = new Map();
    for (const { family, minValue } of set) totals.set(family, (totals.get(family) || 0) + minValue);
    return Array.from(totals, ([family, minValue]) => ({ family, minValue }));
  });

  const families = Array.from(new Set(sets.flatMap((set) => set.map((t) => t.family))));
  const familyIndex = new Map(families.map((f, i) => [f, i]));

  const contribution = (rowFamily, rowValue) => {
    const arr = new Array(families.length).fill(0);
    if (familyIndex.has(rowFamily)) arr[familyIndex.get(rowFamily)] += rowValue;
    for (const [statFamily, allStatFamily] of Object.entries(STAT_ALL_LINKS)) {
      if (rowFamily === allStatFamily && familyIndex.has(statFamily)) arr[familyIndex.get(statFamily)] += rowValue;
    }
    return arr;
  };

  const [rows1, rows2, rows3] = buildSlotRows(categoryData, grade, itemLevel, cube).map((rows) =>
    rows.map((r) => ({ name: r.name, contrib: contribution(r.family, r.value), prob: r.prob })),
  );

  const setSatisfied = (set, sums) => set.every((t) => sums[familyIndex.get(t.family)] >= t.minValue);

  let probAny = 0;
  const probPerSet = sets.map(() => 0);
  const comboProbByLabel = new Map();

  for (const r1 of rows1) {
    for (const r2 of rows2) {
      const prob12 = r1.prob * r2.prob;
      if (prob12 === 0) continue;
      for (const r3 of rows3) {
        const prob = prob12 * r3.prob;
        if (prob === 0) continue;
        const sums = families.map((_, i) => r1.contrib[i] + r2.contrib[i] + r3.contrib[i]);
        let anySetHit = false;
        sets.forEach((set, i) => {
          if (setSatisfied(set, sums)) {
            probPerSet[i] += prob;
            anySetHit = true;
          }
        });
        if (anySetHit) {
          probAny += prob;
          const label = `${r1.name}|${r2.name}|${r3.name}`;
          comboProbByLabel.set(label, (comboProbByLabel.get(label) || 0) + prob);
        }
      }
    }
  }

  if (probAny <= 0) throw new Error("None of these option sets ever appear at this grade/category/item level.");

  const attempts = expectedAttempts(probAny);
  const costPerAttempt = resetCost(cube, manualCost);
  const expectedCost = attempts * costPerAttempt;

  const perSet = sets.map((targets, i) => ({ targets, probAlone: probPerSet[i] }));

  const combinations = Array.from(comboProbByLabel, ([label, prob]) => ({ lines: label.split("|"), prob }))
    .sort((a, b) => b.prob - a.prob);

  return { probPerAttempt: probAny, expectedAttempts: attempts, costPerAttempt, expectedCost, perSet, combinations };
}
