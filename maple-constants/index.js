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
import eventConfigs from "./event-configs.json" with { type: "json" };
import versions from "./versions.json" with { type: "json" };

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

/**
 * Configuration for "event stat" systems — MapleStory events where you spend
 * a weekly event currency to level up stat tracks. The raw data lives in
 * ./event-configs.json; this file just loads and re-exports it. See
 * maple-event-optimizer.js for how it's consumed.
 *
 * Schema:
 *   EVENT_CONFIGS = {
 *     [eventName]: {
 *       lines: [
 *         {
 *           name: string,        // display name for the line
 *           statKey: string,     // must match a key in the parser's `weights` output
 *                                 // (e.g. "attack", "boss_damage", "primary_stat")
 *           levels: [
 *             {
 *               level: number,   // 1-indexed level number
 *               cost: number,    // cost to go from (level - 1) to this level (incremental,
 *                                 // NOT cumulative — level 2 costing 2 means going from
 *                                 // level 1 to level 2 costs 2, total spent so far is 1 + 2 = 3)
 *               value: number,   // CUMULATIVE stat value at this level (not a delta —
 *                                 // level 2 "gives 20" means the stat is 20 at level 2,
 *                                 // not 10 + 20)
 *             },
 *             ...
 *           ],
 *         },
 *         ...
 *       ],
 *     },
 *   }
 *
 * @type {Record<string, { lines: Array<{ name: string, statKey: string, levels: Array<{ level: number, cost: number, value: number }> }> }>}
 */
export const EVENT_CONFIGS = eventConfigs;

/**
 * All valid event name strings, sorted alphabetically.
 * Useful for populating a dropdown.
 *
 * @type {string[]}
 */
export const EVENT_NAMES = Object.keys(EVENT_CONFIGS).sort();

/**
 * MapleStory patch versions. The raw data lives in ./versions.json; this
 * file just loads and re-exports it. Each event config's `version` field
 * should match a `version` value here.
 *
 * Dates aren't tracked yet — entries may later gain a `date` field.
 *
 * @type {Array<{ version: string, alias: string }>}
 */
export const VERSIONS = versions;
