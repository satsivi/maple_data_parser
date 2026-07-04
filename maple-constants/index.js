/**
 * maple-constants/index.js
 *
 * Class → stat type mappings and stat type → primary/secondary definitions.
 * The raw data lives in ./class-stats.json and ./stat-types.json; this file
 * just loads and re-exports it. Import this wherever you need to resolve
 * class identities or stat roles.
 *
 * Uses JSON module import attributes, which requires being served over
 * http(s) in a Chromium-based browser (Chrome/Edge) — not opened via file://,
 * and not supported in Firefox or older Safari.
 */

import classStats from "./class-stats.json" with { type: "json" };
import statTypes from "./stat-types.json" with { type: "json" };

/**
 * Maps every class name (snake_case) to its stat type key.
 * Stat type keys correspond to entries in STAT_TYPES below.
 *
 * @type {Record<string, string>}
 */
export const CLASS_STATS = classStats;

/**
 * Maps each stat type to the raw stat abbreviations that act as
 * primary ("main") and secondary stats for that type.
 *
 * main      — the stats that directly scale the class's damage
 * secondary — stats that contribute a smaller multiplier
 *
 * Notable quirks:
 * - melee_thief: LUK primary, DEX + STR both count as secondary (shadower, dual_blade, cadena)
 * - xenon: all three stats count equally as primary; no secondary
 * - hp: Demon Avenger scales off HP primary, STR secondary
 *
 * @type {Record<string, { main: string[], secondary: string[] }>}
 */
export const STAT_TYPES = statTypes;

/**
 * All valid class name strings, sorted alphabetically.
 * Useful for autocomplete lists.
 *
 * @type {string[]}
 */
export const CLASS_NAMES = Object.keys(CLASS_STATS).sort();
