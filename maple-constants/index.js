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
import potentialCubes from "./potential-cubes.json" with { type: "json" };
import potentialLines from "./potential-lines.json" with { type: "json" };

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

/**
 * Cost model and per-slot grade-match rate for the two covered cubes
 * (Glowing Cube = RED, Bright Cube = POTENTIAL). The raw data lives in
 * ./potential-cubes.json; this file just loads and re-exports it. See
 * maple-potential-calc.js for how it's consumed.
 *
 * slotGradeMatch is sourced from Nexon's official per-item probability
 * disclosure pages (maplestory.nexon.com/Guide/OtherProbability/cube/*).
 * Both cubes are cash-shop/drop items with no fixed meso price, so
 * defaultManualCost is just a starting point — the UI's Cost per cube field
 * and Cube Sale toggle (25% off) are what actually drive the calculation.
 *
 * @type {Record<string, { label: string, costModel: string, defaultManualCost?: number, slotGradeMatch: { slot1: number, slot2: number, slot3: number } }>}
 */
export const POTENTIAL_CUBES = potentialCubes;

/**
 * Both covered potential cube keys, in display order (matching the order
 * they appear in ./potential-cubes.json).
 *
 * @type {string[]}
 */
export const POTENTIAL_CUBE_KEYS = Object.keys(POTENTIAL_CUBES);

/**
 * Real per-line potential data — a hybrid of live KMS Nexon data (pool
 * membership and per-line probability) and StrategyWiki's GMS-specific value
 * tables (for lines that scale continuously with item level), verified to
 * reproduce mesu.live's own numbers exactly. Separate per cube, since
 * Glowing Cube (RED) and Bright Cube (POTENTIAL) draw from different live
 * KMS pools/rates. See CLAUDE.md's Potential Calculator section for the full
 * provenance, why the split exists, and the build-script notes.
 *
 * Shape: POTENTIAL_LINES[cubeKey][equipCategory].grades[grade].{prime,nonPrime} = Array<Line>
 * where `grade` is RARE/EPIC/UNIQUE/LEGENDARY and each slot's actual roll is
 * "prime" (matches the target grade) with probability POTENTIAL_CUBES[cubeKey]
 * .slotGradeMatch[slotN], else "non-prime" (rolls as if one grade lower).
 * RARE's own non-prime pool can't be queried from KMS (grades only go 1-4,
 * so there's no "one below Rare" to ask for) and falls back to StrategyWiki's
 * "Rare (Non-prime)" tier verbatim (`source: "wiki-fallback"`).
 *
 * Line shape:
 *   {
 *     name: string,               // the stat's own display name
 *     family: string,             // groups same-shape lines for "at least this good" targeting
 *     valueRows: Array<{min:number, max:number|null, gms:boolean, value:number}> | null,
 *                                 // per-item-level value brackets (max:null = no upper bound;
 *                                 // gms:true rows are GMS-specific overrides that take priority
 *                                 // over the general row for the same item level) — present only
 *                                 // when source is "wiki-value"; null otherwise (see fixedValue)
 *     fixedValue: number | null,  // constant value for lines without a level-scaled table —
 *                                 // KMS's own scraped value for "kms"-sourced lines, or the
 *                                 // wiki's as-is value for "wiki-fallback" (Rare non-prime) lines
 *     cashPct: number,            // % chance this line is chosen, conditional on the slot
 *                                 // already being at this grade/prime-state — from live KMS data
 *                                 // for "kms"/"wiki-value" lines, or the wiki's own rate for the
 *                                 // "wiki-fallback" Rare non-prime tier
 *     minLevel: number,           // item level below which this line isn't in the pool at all —
 *                                 // from the wiki for "wiki-value" lines, else a flat 100 default
 *                                 // (KMS's search tool doesn't expose per-line level gating)
 *     maxAppearances: number|null // wiki-noted cap on how many slots can show this line — not
 *                                 // currently enforced by computeOptionSetsHitPlan
 *     source: "kms"|"wiki-value"|"wiki-fallback", // which of the two sources this line came from
 *   }
 *
 * @type {Record<string, Record<string, { grades: Record<string, { prime: Array<object>, nonPrime: Array<object> }> }>>}
 */
export const POTENTIAL_LINES = potentialLines;

/**
 * Equipment categories with real GMS potential data, mapped to a readable
 * English label. Several groups share identical data on the wiki (e.g. Top
 * and Overall) but are still listed separately here for a natural UI.
 *
 * @type {Record<string, string>}
 */
export const POTENTIAL_EQUIP_CATEGORIES = {
  WEAPON: "Weapon",
  EMBLEM: "Emblem",
  SECONDARY_WEAPON: "Secondary Weapon (excl. Demon Aegis/Soul Ring)",
  SHIELD_SOULRING: "Demon Aegis / Soul Ring",
  HAT: "Hat",
  TOP: "Top",
  OVERALL: "Overall",
  BOTTOM: "Bottom",
  SHOES: "Shoes",
  GLOVES: "Gloves",
  CAPE: "Cape",
  BELT: "Belt",
  SHOULDER: "Shoulder Accessory",
  FACE: "Face Accessory",
  EYE: "Eye Accessory",
  EARRING: "Earrings",
  RING: "Ring",
  PENDANT: "Pendant",
  HEART: "Mechanical Heart",
  BADGE: "Badge",
};
