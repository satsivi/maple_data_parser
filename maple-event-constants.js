/**
 * maple-event-constants.js
 *
 * Configuration for "event stat" systems — MapleStory events where you spend
 * a weekly event currency to level up stat tracks. Each level has a cost and
 * grants a cumulative (not incremental) stat value.
 *
 * Replace the placeholder below with real event data.
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
export const EVENT_CONFIGS = {
  // placeholder — replace with real event data
  example_event: {
    lines: [
      {
        name: "Attack Track",
        statKey: "attack",
        levels: [
          { level: 1, cost: 100, value: 10 },
          { level: 2, cost: 150, value: 20 },
          { level: 3, cost: 220, value: 35 },
        ],
      },
    ],
  },
};

/**
 * All valid event name strings, sorted alphabetically.
 * Useful for populating a dropdown.
 *
 * @type {string[]}
 */
export const EVENT_NAMES = Object.keys(EVENT_CONFIGS).sort();
