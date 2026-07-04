/**
 * maple-parser.js
 *
 * Pure parsing logic. No DOM, no side effects.
 *
 * Primary export: parse(rawText, className)
 * Returns a structured result object or throws on bad input.
 */

import { CLASS_STATS, STAT_TYPES } from "./maple-constants/index.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const STAT_ABBRS = ["STR", "DEX", "INT", "LUK", "HP"];

/**
 * Detect the equivalence type from the third column header.
 * Returns null if no recognizable header is found — caller should error on null.
 *
 * @param {string[]} lines
 * @returns {"final_damage" | "main_stat" | null}
 */
function detectEquivalenceType(lines) {
  for (const line of lines) {
    if (line.startsWith("\uD56D\uBAA9") || line.toLowerCase().startsWith("stat")) {
      const parts = line.split("\t");
      if (parts.length >= 3) {
        const col = parts[2].trim().toLowerCase();
        if (col.includes("main"))                             return "main_stat";
        if (col.includes("final") || col.includes("damage")) return "final_damage";
        // Header row found but 3rd column is unrecognized
        return null;
      }
    }
  }
  // No header row at all — also unrecognized
  return null;
}

/**
 * Map a raw row label to a canonical weight key.
 *
 * Stat hierarchy (ordered):
 *   most classes:  main=[X],         secondary=[Y]       -> primary, secondary
 *   melee_thief:   main=[LUK],       secondary=[DEX,STR] -> primary, secondary, tertiary
 *   xenon:         main=[STR,DEX,LUK], secondary=[]      -> primary, secondary, tertiary
 *
 * Tertiary keys are omitted for all other classes; consumers treat missing = null.
 */
function canonicalKey(label, statType) {
  const { main, secondary } = STAT_TYPES[statType];
  const [primaryStat, secondaryStat, tertiaryStat] = [...main, ...secondary];

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

  // Fallback slug for unrecognized rows
  return label
    .replace(/\s*\((\d+)\)/g, "_$1")
    .replace(/\s+/g, "_")
    .replace(/%/g, "pct")
    .replace(/Not_Affected_by_%_/i, "flat_")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

/**
 * Extract which bare stat abbreviations appear as row labels in the table
 * (i.e. "STR", "DEX", "LUK" etc. — not "STR%" or "Not Affected by % STR").
 * Used to validate that the pasted table matches the selected class.
 *
 * @param {string[]} dataLines - Header-stripped data rows
 * @returns {string[]} e.g. ["LUK", "DEX", "STR"]
 */
function extractTableStats(dataLines) {
  return dataLines
    .map((l) => l.split("\t")[0]?.trim())
    .filter((label) => STAT_ABBRS.includes(label));
}

/**
 * Validate that the stats found in the table match the expected stats for the class.
 * Expected = all of main + secondary, in any order.
 *
 * @param {string[]} tableStats  - Stat abbrs found in the pasted table
 * @param {string}   statType    - Key into STAT_TYPES
 * @throws {Error} if there is a mismatch
 */
function validateStatMatch(tableStats, statType) {
  const { main, secondary } = STAT_TYPES[statType];
  const expected = [...main, ...secondary].sort();
  const found    = [...tableStats].sort();

  const missing = expected.filter((s) => !found.includes(s));
  const extra   = found.filter((s) => !expected.includes(s));

  if (missing.length > 0 || extra.length > 0) {
    const parts = [];
    if (missing.length) parts.push(`expected but not found: ${missing.join(", ")}`);
    if (extra.length)   parts.push(`found but not expected: ${extra.join(", ")}`);
    throw new Error(
      `Stat mismatch for class "${statType}" — ${parts.join("; ")}. ` +
      `Make sure you selected the right class for this table.`
    );
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Parse a raw MapleStory stat equivalence table into a structured JSON object.
 *
 * Weights are the raw per-unit values: col3 / value for each row.
 * e.g. for Final Damage%: boss_damage = 3.805% / 40 = 0.095125 FD% per 1 boss damage
 * e.g. for Main Stat: boss_damage = 9696.96 / 40 = 242.424 main stat per 1 boss damage
 *
 * Validates:
 *   - The third column header must be recognizable as "Final Damage %" or "Main Stat"
 *   - The stat rows in the table must match the expected stats for the selected class
 *
 * @param {string} rawText    - Full pasted text, tab-separated, should include header row
 * @param {string} className  - Snake_case class name, e.g. "dual_blade"
 * @returns {{
 *   class: string,
 *   stat_type: string,
 *   equivalence_type: "final_damage" | "main_stat",
 *   weights: Record<string, number>
 * }}
 * @throws {Error} on unknown class, unrecognized table format, stat mismatch, or bad input
 */
export function parse(rawText, className) {
  // --- validate class ---
  const statType = CLASS_STATS[className];
  if (!statType) {
    throw new Error(`Unknown class: "${className}". Check maple-constants/ for valid names.`);
  }

  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

  // --- validate column type ---
  const equivalenceType = detectEquivalenceType(lines);
  if (equivalenceType === null) {
    throw new Error(
      `Unrecognized table format. The third column header must be "Final Damage%" or "Main Stat". ` +
      `Make sure you are pasting the full table including the header row.`
    );
  }

  const dataLines = lines.filter(
    (l) => !l.startsWith("\uD56D\uBAA9") && !l.toLowerCase().startsWith("stat")
  );

  if (dataLines.length < 7) {
    throw new Error(`Too few data rows (${dataLines.length}). Expected at least 7. Check your paste.`);
  }

  // --- validate stat match ---
  const tableStats = extractTableStats(dataLines);
  validateStatMatch(tableStats, statType);

  // --- parse rows ---
  const rows = [];
  for (const line of dataLines) {
    const parts = line.split("\t");
    if (parts.length < 3) {
      throw new Error(`Could not parse row: "${line}" — expected 3 tab-separated columns.`);
    }
    const label = parts[0].trim();
    const value = parseFloat(parts[1].trim());
    const col3  = parseFloat(parts[2].trim().replace("%", ""));
    if (isNaN(value) || isNaN(col3)) {
      throw new Error(`Invalid numbers in row: "${line}"`);
    }
    rows.push({ label, key: canonicalKey(label, statType), value, col3, perUnit: col3 / value });
  }

  // --- normalize weights ---
  // First occurrence of each key wins — handles xenon's 3 equal primaries collapsing
  // to primary_stat / primary_stat_pct / flat_unaffected_primary_stat
  const weights = {};
  for (const row of rows) {
    if (!(row.key in weights)) {
      weights[row.key] = parseFloat(row.perUnit.toFixed(6));
    }
  }

  return { class: className, stat_type: statType, equivalence_type: equivalenceType, weights };
}
