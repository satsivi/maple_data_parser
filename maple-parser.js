/**
 * maple-parser.js
 *
 * Pure parsing logic. No DOM, no side effects.
 *
 * Primary export: parse(rawText, className)
 * Returns a structured result object or throws on bad input.
 */

import { CLASS_STATS, STAT_TYPES } from "./maple-constants.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const STAT_ABBRS = ["STR", "DEX", "INT", "LUK", "HP"];

/**
 * Detect whether the pasted table is "Final Damage %" or "Main Stat"
 * by reading the third column header. Falls back to "final_damage" if
 * no header row is found.
 */
function detectEquivalenceType(lines) {
  for (const line of lines) {
    if (line.startsWith("\uD56D\uBAA9") || line.toLowerCase().startsWith("stat")) {
      const parts = line.split("\t");
      if (parts.length >= 3) {
        const col = parts[2].trim().toLowerCase();
        if (col.includes("main"))                             return "main_stat";
        if (col.includes("final") || col.includes("damage")) return "final_damage";
      }
    }
  }
  return "final_damage";
}

/**
 * Map a raw row label to a canonical weight key.
 *
 * Stat hierarchy per class:
 *   - main[0]      -> primary
 *   - secondary[0] -> secondary  (if exists)
 *   - secondary[1] -> tertiary   (melee_thief only: STR)
 *   - main[1]      -> secondary  (xenon: DEX)
 *   - main[2]      -> tertiary   (xenon: LUK)
 *
 * Downstream consumers treat primary=1, secondary=some value, tertiary=some value,
 * and can assume tertiary is null if not present in the output.
 */
function canonicalKey(label, statType) {
  const { main, secondary } = STAT_TYPES[statType];

  // Resolve ordered stat roles: [primary, secondary, tertiary]
  // For most classes: main=[X], secondary=[Y] -> [X, Y]
  // For melee_thief:  main=[LUK], secondary=[DEX, STR] -> [LUK, DEX, STR]
  // For xenon:        main=[STR, DEX, LUK], secondary=[] -> [STR, DEX, LUK]
  const [primaryStat, secondaryStat, tertiaryStat] = [
    ...main,
    ...secondary,
  ];

  const roleOf = (abbr) => {
    if (abbr === primaryStat)   return "primary";
    if (abbr === secondaryStat) return "secondary";
    if (abbr === tertiaryStat)  return "tertiary";
    return null;
  };

  switch (label) {
    case "Boss Damage":     return "boss_damage";
    case "Attack":          return "attack";
    case "Attack%":         return "attack_pct";
    case "Critical Dmg":    return "critical_damage";
    case "Ignore Dff(300)": return "ied_300";
    case "Ignore Dff(380)": return "ied_380";
    case "All Stat%":       return "all_stat_pct";
  }

  for (const abbr of STAT_ABBRS) {
    const role = roleOf(abbr);
    if (!role) continue;

    if (label === abbr)                        return `${role}_stat`;
    if (label === `${abbr}%`)                  return `${role}_stat_pct`;
    if (label === `Not Affected by % ${abbr}`) return `flat_unaffected_${role}_stat`;
  }

  // Fallback: generic slug for anything unrecognized
  return label
    .replace(/\s*\((\d+)\)/g, "_$1")
    .replace(/\s+/g, "_")
    .replace(/%/g, "pct")
    .replace(/Not_Affected_by_%_/i, "flat_")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Parse a raw MapleStory stat equivalence table into a structured JSON object.
 *
 * Weights are normalized so primary_stat = 1. All other values represent
 * "how much primary stat is this worth per unit?"
 *
 * Stat keys used:
 *   primary_stat, primary_stat_pct, flat_unaffected_primary_stat
 *   secondary_stat, secondary_stat_pct, flat_unaffected_secondary_stat
 *   tertiary_stat, tertiary_stat_pct, flat_unaffected_tertiary_stat  (melee_thief + xenon only)
 *
 * tertiary_* keys are omitted entirely for other classes; consumers should treat
 * a missing tertiary as null.
 *
 * @param {string} rawText    - Full pasted text, tab-separated, may include header row
 * @param {string} className  - Snake_case class name, e.g. "dual_blade"
 * @returns {{
 *   class: string,
 *   stat_type: string,
 *   equivalence_type: "final_damage" | "main_stat",
 *   weights: Record<string, number>
 * }}
 * @throws {Error} on unknown class, malformed input, or missing primary stat row
 */
export function parse(rawText, className) {
  const statType = CLASS_STATS[className];
  if (!statType) {
    throw new Error(`Unknown class: "${className}". Check maple-constants.js for valid names.`);
  }

  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const equivalenceType = detectEquivalenceType(lines);

  const dataLines = lines.filter(
    (l) => !l.startsWith("\uD56D\uBAA9") && !l.toLowerCase().startsWith("stat")
  );

  if (dataLines.length < 7) {
    throw new Error(`Too few data rows (${dataLines.length}). Expected at least 7. Check your paste.`);
  }

  const rows = [];
  for (const line of dataLines) {
    const parts = line.split("\t");
    if (parts.length < 3) {
      throw new Error(`Could not parse row: "${line}" - expected 3 tab-separated columns.`);
    }
    const label = parts[0].trim();
    const value = parseFloat(parts[1].trim());
    const col3  = parseFloat(parts[2].trim().replace("%", ""));
    if (isNaN(value) || isNaN(col3)) {
      throw new Error(`Invalid numbers in row: "${line}"`);
    }
    rows.push({ label, key: canonicalKey(label, statType), value, col3, perUnit: col3 / value });
  }

  const primaryRow = rows.find((r) => r.key === "primary_stat");
  if (!primaryRow || primaryRow.perUnit === 0) {
    throw new Error(
      "Could not find the primary stat row. Verify the class selection matches the pasted table."
    );
  }
  const primaryPerUnit = primaryRow.perUnit;

  // Build weights — first occurrence of each key wins (handles xenon's 3 equal primaries
  // all collapsing to primary_stat / primary_stat_pct / flat_unaffected_primary_stat)
  const weights = {};
  for (const row of rows) {
    if (!(row.key in weights)) {
      weights[row.key] = parseFloat((row.perUnit / primaryPerUnit).toFixed(6));
    }
  }

  return { class: className, stat_type: statType, equivalence_type: equivalenceType, weights };
}
