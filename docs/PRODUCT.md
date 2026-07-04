# Product

## Register

product

## Users

The developer and a small circle of friends/guildmates who play MapleStory. Everyone using this already understands the game's stat-efficiency mechanics (Maplescouter's Stat Efficiency export, Final Damage% / Main Stat equivalence, event point-buy mechanics) — no onboarding for domain concepts is needed. The job to be done is fast, accurate number-crunching: paste a stat table, get equivalences; configure an event's point budget, get an optimal purchase schedule. Sessions are short and utilitarian — open the tool, get an answer, close it.

## Product Purpose

A browser-based toolbox for MapleStory theorycrafting math that's tedious or error-prone to do by hand: converting Maplescouter stat-efficiency exports into per-unit equivalence weights, and optimizing event point spending against reserved levels and deadlines. Success is getting from raw pasted data to a trustworthy number in as few actions as possible, with zero ambiguity about what a number means.

## Brand Personality

Playful game companion — dark and functional at its core (the existing dense, monospace-forward, dev-tool-like table layout is the right foundation), but with room for warmth and personality drawn from MapleStory itself rather than from generic app chrome: its color language, its sense of whimsy (the 🍁 in the sidebar/toolbar titles is a good instinct, not a placeholder), small delightful touches over sterile efficiency. Voice is casual and a little irreverent (see README: "vibing with Maple", "so people don't blow things up with the wrong stat") — not corporate, not cutesy-childish.

## Anti-references

- Generic SaaS/admin-dashboard look: templated card grids, generic icon-pack iconography, boilerplate KPI tiles, anything that could be mistaken for a B2B analytics product.
- Cluttered fan-wiki/fansite aesthetic: ad-cluttered layouts, inconsistent spacing, walls of unstyled tables — the classic "old MapleStory community site" look.

## Design Principles

- Numbers first: every design decision should make scanning dense tabular data faster and less error-prone (alignment, monospace for values, sticky headers, clear units).
- Zero ambiguity: a value on screen should always be self-evident in what it represents (stat, equivalence type, unit) without requiring the user to cross-reference other panels.
- Game-flavored, not game-themed: personality comes from MapleStory's own color/iconographic language and voice, not from decorative skins or mascots bolted onto a generic app shell.
- Built for people who already know the domain: no hand-holding copy, no explaining what Final Damage% is — trust the user's expertise and get out of their way.
- Small-circle tool, not a public product: optimize for the developer's and friends' actual workflow over broad discoverability or marketing polish.

## Accessibility & Inclusion

Sensible defaults: strong color contrast, full keyboard support for interactive elements (inputs, dropdowns, tab switching), no reliance on color alone to convey state (errors are also marked with text/icons, not just red). No specialized accommodations requested by the current user group.
