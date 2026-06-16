/**
 * maple-constants.js
 *
 * Class → stat type mappings and stat type → primary/secondary definitions.
 * Import this wherever you need to resolve class identities or stat roles.
 */

/**
 * Maps every class name (snake_case) to its stat type key.
 * Stat type keys correspond to entries in STAT_TYPES below.
 *
 * @type {Record<string, string>}
 */
export const CLASS_STATS = {
  hero:            "str",
  paladin:         "str",
  dark_knight:     "str",
  archmage_fp:     "int",
  archmage_il:     "int",
  bishop:          "int",
  bowmaster:       "dex",
  marksman:        "dex",
  pathfinder:      "dex",
  night_lord:      "luk",
  shadower:        "melee_thief",
  dual_blade:      "melee_thief",
  buccaneer:       "str",
  corsair:         "dex",
  cannoneer:       "str",
  dawn_warrior:    "str",
  blaze_wizard:    "int",
  wind_archer:     "dex",
  night_walker:    "luk",
  thunder_breaker: "str",
  mihile:          "str",
  aran:            "str",
  evan:            "int",
  mercedes:        "dex",
  phantom:         "luk",
  luminous:        "int",
  shade:           "str",
  blaster:         "str",
  battle_mage:     "int",
  wild_hunter:     "dex",
  mechanic:        "dex",
  xenon:           "xenon",
  demon_slayer:    "str",
  demon_avenger:   "hp",
  kaiser:          "str",
  kain:            "dex",
  cadena:          "melee_thief",
  angelic_buster:  "dex",
  zero:            "str",
  kinesis:         "int",
  adele:           "str",
  illium:          "int",
  ark:             "str",
  hoyoung:         "luk",
  lara:            "int",
  khali:           "luk",
  ren:             "dex",
  lynn:            "int",
  hayato:          "str",
  kanna:           "int",
  sia_astelle:     "int",
  erel_light:      "int",
  mo_xuan:         "str",
};

/**
 * Maps each stat type to the raw stat abbreviations that act as
 * primary ("main") and secondary stats for that type.
 *
 * main      — the stats that directly scale the class's damage
 * secondary — stats that contribute a smaller multiplier
 *
 * @type {Record<string, { main: string[], secondary: string[] }>}
 */
export const STAT_TYPES = {
  str: {
    main:      ["STR"],
    secondary: ["DEX"],
  },
  dex: {
    main:      ["DEX"],
    secondary: ["STR"],
  },
  int: {
    main:      ["INT"],
    secondary: ["LUK"],
  },
  luk: {
    main:      ["LUK"],
    secondary: ["DEX"],
  },
  melee_thief: {
    // LUK primary, DEX + STR both count as secondary
    main:      ["LUK"],
    secondary: ["DEX", "STR"],
  },
  xenon: {
    // All three stats count equally as primary; no secondary
    main:      ["STR", "DEX", "LUK"],
    secondary: [],
  },
  hp: {
    // Demon Avenger scales off HP primary, STR secondary
    main:      ["HP"],
    secondary: ["STR"],
  },
};

/**
 * All valid class name strings, sorted alphabetically.
 * Useful for autocomplete lists.
 *
 * @type {string[]}
 */
export const CLASS_NAMES = Object.keys(CLASS_STATS).sort();
