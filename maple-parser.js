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
 *
 * @param {string[]} lines  - Raw lines from the paste, already trimmed
 * @returns {"final_damage" | "main_stat"}
 */
function detectEquivalenceType(lines) {
  for (const line of lines) {
    if (line.startsWith("항목") || line.toLowerCase().startsWith("stat")) {
      const parts = line.split("\t");
      if (parts.length >= 3) {
        const col = parts[2].trim().toLowerCase();
        if (col.includes("main"))                       return "main_stat";
        if (col.includes("final") || col.includes("damage")) return "final_damage";
      }
    }
  }
  return "final_damage";
}

/**
 * Map a raw row label to a canonical weight key, respecting class stat roles.
 *
 * Generic rows (Boss Damage, Attack, IED…) get fixed keys.
 * Stat rows (STR, DEX%, Not Affected by % LUK…) are mapped to
 * primary_stat / secondary_stat / flat_unaffected_* based on the class.
 *
 * For Xenon (3 equal mains), all three raw stats map to primary_stat /
 * primary_stat_pct / flat_unaffected_primary_stat. The parser deduplicates,
 * keeping the first occurrence — all three have the same per-unit value anyway.
 *
 * @param {string}   label    - e.g. "Not Affected by % STR"
 * @param {string}   statType - key into STAT_TYPES, e.g. "melee_thief"
 * @returns {string}          - canonical snake_case key
 */
function canonicalKey(label, statType) {
  const { main, secondary } = STAT_TYPES[statType];

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
    const isMain = main.includes(abbr);
    const isSec  = secondary.includes(abbr);

    if (label === abbr) {
      if (isMain) return "primary_stat";
      if (isSec)  return "secondary_stat";
      return abbr.toLowerCase();
    }
    if (label === `${abbr}%`) {
      if (isMain) return "primary_stat_pct";
      if (isSec)  return "secondary_stat_pct";
      return `${abbr.toLowerCase()}_pct`;
    }
    if (label === `Not Affected by % ${abbr}`) {
      if (isMain) return "flat_unaffected_primary_stat";
      if (isSec)  return "flat_unaffected_secondary_stat";
      return `flat_unaffected_${abbr.toLowerCase()}`;
    }
  }

  // Fallback: generic slug
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
 * The weights object is normalized so that 1 primary_stat = 1.000000.
 * Every other stat value is expressed as: "how much primary stat is this worth?"
 *
 * @param {string} rawText    - The full pasted text, tab-separated, may include header
 * @param {string} className  - Snake_case class name, e.g. "demon_avenger"
 * @returns {{
 *   class: string,
 *   stat_type: string,
 *   equivalence_type: "final_damage" | "main_stat",
 *   weights: Record<string, number>
 * }}
 * @throws {Error} if the class is unknown, the input is malformed, or the
 *                 primary stat row cannot be found
 */
export function parse(rawText, className) {
  // --- validate class ---
  const statType = CLASS_STATS[className];
  if (!statType) {
    throw new Error(`Unknown class: "${className}". Check maple-constants.js for valid names.`);
  }

  // --- split and strip header ---
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const equivalenceType = detectEquivalenceType(lines);

  const dataLines = lines.filter(
    (l) => !l.startsWith("항목") && !l.toLowerCase().startsWith("stat")
  );

  if (dataLines.length < 7) {
    throw new Error(
      `Too few data rows (${dataLines.length}). Expected at least 7. Check your paste.`
    );
  }

  // --- parse each row ---
  const rows = [];
  for (const line of dataLines) {
    const parts = line.split("\t");
    if (parts.length < 3) {
      throw new Error(
        `Could not parse row: "${line}" — expected 3 tab-separated columns.`
      );
    }

    const label   = parts[0].trim();
    const value   = parseFloat(parts[1].trim());
    // Third column is either "3.725%" (FD) or "9696.96" (main stat) — strip % if present
    const col3    = parseFloat(parts[2].trim().replace("%", ""));

    if (isNaN(value) || isNaN(col3)) {
      throw new Error(`Invalid numbers in row: "${line}"`);
    }

    rows.push({
      label,
      key: canonicalKey(label, statType),
      value,
      col3,
      perUnit: col3 / value,
    });
  }

  // --- find primary stat per-unit for normalization ---
  const primaryRow = rows.find((r) => r.key === "primary_stat");
  if (!primaryRow || primaryRow.perUnit === 0) {
    throw new Error(
      "Could not find the primary stat row. Verify the class selection matches the pasted table."
    );
  }
  const primaryPerUnit = primaryRow.perUnit;

  // --- build normalized weights, deduplicate canonical keys (first wins) ---
  const weights = {};
  for (const row of rows) {
    if (!(row.key in weights)) {
      weights[row.key] = parseFloat((row.perUnit / primaryPerUnit).toFixed(6));
    }
  }

  return {
    class:            className,
    stat_type:        statType,
    equivalence_type: equivalenceType,
    weights,
  };
}
