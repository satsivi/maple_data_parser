---
name: Maple Stat Equivalence Parser
description: A dense, dark theorycrafting toolbox for MapleStory stat math and event optimization.
colors:
  bg: "#17140f"
  surface: "#211c15"
  surface-2: "#2b2419"
  border: "#3a3225"
  maple-amber: "#e0993d"
  maple-amber-dim: "#4a3a1e"
  text: "#f0ead9"
  text-muted: "#8c8270"
  success-olive: "#9bc53d"
  error-warm-red: "#e2543d"
typography:
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.07em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  data:
    fontFamily: "JetBrains Mono, Fira Code, Cascadia Code, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  wordmark:
    fontFamily: "Fredoka, Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.01em"
rounded:
  sm: "5px"
  md: "6px"
  lg: "8px"
  pill: "20px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "16px"
components:
  button-primary:
    backgroundColor: "{colors.maple-amber}"
    textColor: "#1a1108"
    rounded: "{rounded.md}"
    padding: "5px 14px"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.md}"
    padding: "5px 14px"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "5px 10px"
  tab-active:
    backgroundColor: "{colors.maple-amber-dim}"
    textColor: "{colors.maple-amber}"
    rounded: "{rounded.md}"
    padding: "9px 10px"
---

# Design System: Maple Stat Equivalence Parser

## 1. Overview

**Creative North Star: "The Theorycrafter's Desk"**

This is a late-night min-maxing desk, not a company's product — a spreadsheet-and-calculator surface built by one player for a small circle of guildmates who already speak the game's math fluently. Density and precision come first: numbers line up, units are unambiguous, and every panel exists to answer one calculation as fast as possible. Personality doesn't come from decoration; it comes from color and voice drawn from the game itself — the maple leaf in the sidebar title isn't a placeholder icon, it's the palette's namesake.

The system explicitly rejects the generic SaaS/admin-dashboard look (card grids, stock icon packs, KPI tiles) and the cluttered fan-wiki aesthetic (ad-choked layouts, inconsistent tables). It also deliberately steers away from the violet-accent-on-navy palette that has become the default "AI-generated dark tool" look — the signature color here is warm amber, not purple, and the neutrals are warmed toward brown-charcoal rather than cool navy.

**Key Characteristics:**
- Warm, near-black charcoal surfaces (not cool navy) layered by lightness, not by shadow
- One signature accent — Maple Amber — used sparingly for actions, focus, and emphasis
- Monospace for every number; sans for every label and UI chrome
- Flat surfaces, sticky headers, zero decorative motion — density and legibility over polish

## 2. Colors: The Maple Desk Palette

A warm, autumn-leaf-toned dark palette. Backgrounds and surfaces share one warm hue family (near #17140f–#3a3225); the only saturated color is the amber accent, which reads as the maple leaf itself rather than a generic brand purple.

### Primary
- **Maple Amber** (#e0993d): The single accent. Primary buttons, focus rings, links, active tab state, the equivalence values in the output table. Used sparingly — its rarity against the warm charcoal neutrals is what makes it read as "the number that matters."

### Neutral
- **Ember Black** (#17140f): Page background.
- **Warm Char** (#211c15): Panel and input surfaces (textareas, buttons, table rows at rest).
- **Warm Char Raised** (#2b2419): Hover/active state for rows, tabs, and dropdown items — the next lightness step up.
- **Dim Border** (#3a3225): All dividers, panel borders, and input outlines.
- **Parchment Text** (#f0ead9): Primary text — warm off-white, not cool gray-white.
- **Faded Ink** (#8c8270): Muted text — placeholders, labels, secondary copy.

### Semantic
- **Olive Success** (#9bc53d): Copy-confirmation, valid states. Warmed toward olive/lime rather than a stock mint-green, to stay in the same warm family as the rest of the palette.
- **Warm Red Error** (#e2543d): Inline errors and invalid states. Warmed toward coral-red rather than a stock Tailwind red, echoing the maple-leaf red rather than a generic alert color.

### Named Rules
**The One Ember Rule.** Maple Amber is the only saturated color on screen at any time. Success/error states are semantic, not decorative, and never compete with the amber accent for attention. If a screen has more than one saturated hue drawing the eye at once, something's wrong.

## 3. Typography

**Body Font:** Inter (with system-ui, sans-serif)
**Data/Mono Font:** JetBrains Mono (with Fira Code, Cascadia Code, monospace fallback)
**Wordmark Font:** Fredoka (with Inter, system-ui, sans-serif fallback) — the sidebar's "Mimi's Tools" label only, nowhere else.

**Character:** A plain, technical sans for every label and control, paired with a monospace face reserved strictly for numbers and raw data — so the eye can tell "this is a value" from "this is UI chrome" without reading it. The one deliberate exception is the sidebar wordmark: a chunky, rounded display face used for exactly one string, giving the tool a personal, hand-made signature without asking the rest of the interface to feel playful.

### Hierarchy
Two sizes, not three: hierarchy comes from weight and letter-spacing, not from stacking closely-spaced font sizes.
- **Title** (600 weight, 13px, 1.3 line-height): Toolbar titles. Distinguished from body text by weight, not size — this tool has no hero or display type.
- **Body** (500 weight, 13px, 1.4 line-height): Buttons, tab labels, input text, general UI copy.
- **Label** (600 weight, 10px, 1.3 line-height, 0.06–0.07em tracking, uppercase): Panel labels, table headers, stat badges, status chips. Always uppercase and tracked wide to read as metadata, not content.
- **Data** (400 weight, 13px, 1.65 line-height, JetBrains Mono): Every numeric value — table cells, inputs holding numbers, JSON output, equivalence results. Never rendered in the sans family.
- **Wordmark** (700 weight, 13px, 1.3 line-height, 0.01em tracking, Fredoka): The sidebar's "Mimi's Tools" text, in Maple Amber. Same size as Title — the font itself, not a bigger size, carries the personality.

### Named Rules
**The Two-Step Rule.** The system uses exactly two font sizes — 10px (label) and 13px (everything else) — with weight and tracking carrying the rest of the hierarchy. Do not introduce an intermediate size (11px, 12px, 12.5px) to distinguish a "slightly smaller" role; that produces a flat, AI-tell type scale where nothing reads as clearly bigger or smaller than anything else. If a new role needs to stand apart, change weight/tracking/case first, and only add a third size if it's at least 1.25× the nearest existing step.

**The Mono-Is-Data Rule.** If it's a number the user will read or copy, it's JetBrains Mono. If it's a label describing that number, it's Inter. Never mix the two roles.

**The One Wordmark Rule.** Fredoka is reserved for the sidebar's "Mimi's Tools" text and nowhere else. It is a signature, not a typeface option — if a second element starts using it, the rule has failed. Everything else stays Inter/JetBrains Mono.

## 4. Elevation

Flat by default — there is no shadow vocabulary for surfaces at rest. Depth is conveyed by layering three warm neutrals (Ember Black → Warm Char → Warm Char Raised) rather than by casting shadows; a panel reads as "above" another by being one step lighter, not by having a drop shadow under it.

### Shadow Vocabulary
- **Popover lift** (`box-shadow: 0 8px 24px rgba(0,0,0,0.5)`): Reserved for the one truly floating element — the class-name autocomplete dropdown. Not used anywhere else.

### Named Rules
**The Flat-Desk Rule.** Shadows exist only where content genuinely floats above the layout (the autocomplete popover). Every other surface expresses depth through the tonal ramp, never a shadow.

## 5. Components

### Buttons
- **Shape:** 6px radius, all variants.
- **Primary:** Solid Maple Amber (#e0993d) fill with dark ink text, 5px 14px padding. Used for the single primary action per view ("Parse →", "Optimize →").
- **Ghost / Copy:** Warm Char (#211c15) background, 1px Dim Border outline, Faded Ink text. Used for secondary actions (Clear, Copy JSON).
- **Hover / Focus:** Opacity drops to 0.82 on hover for all buttons — no color shift, no shadow, no scale. The Copy button additionally swaps to Olive Success text/border once a copy succeeds, as direct confirmation.

### Chips / Badges
- **Style:** Pill shape (20px radius), Maple Amber text on a dim amber-tinted background (#4a3a1e), uppercase, 0.04em tracked. Used for the class's stat-type badge next to the class picker.

### Inputs / Fields
- **Style:** Warm Char (#211c15) background, 1px Dim Border outline, 6px radius, JetBrains Mono for anything holding a number (quantities, weights, points), Inter for anything holding text (class name).
- **Focus:** Border shifts to Maple Amber. No glow, no shadow — a color-only cue.
- **Error:** Surfaced via a separate inline error line (Warm Red Error text, ⚠ prefix) next to the toolbar, not by recoloring the input itself.

### Tables
- **Style:** Borderless rows separated by 1px Dim Border lines; sticky header pinned to the page background with uppercase tracked labels.
- **Hover:** Row background steps up to Warm Char Raised — the same tonal-layering logic used everywhere else, not a highlight color.
- **Values:** Right-aligned, JetBrains Mono, 600 weight, Maple Amber — the one place the accent appears repeatedly, because these are the numbers the whole tool exists to produce.

### Navigation (Sidebar Tabs)
- **Style:** Vertical list, transparent at rest, Faded Ink text. Active tab gets Maple Amber Dim (#4a3a1e) background, Maple Amber text, and a 2px solid Maple Amber left border — the one intentional use of a left-border accent in the system, reserved exclusively for "you are here" navigation state.

### Sidebar Wordmark
- **Style:** "🍁 Mimi's Tools" — the only place Fredoka (700 weight) appears in the system, in Maple Amber, same 13px size as everything else. No pill, no badge background; the chunky rounded letterforms alone carry the "cute and approachable" personality without touching the rest of the tool's density. See the One Wordmark Rule.

### Scrollbars
- **Style:** Thin (8px), transparent track, Dim Border (#3a3225) thumb at rest, Faded Ink (#8c8270) on hover. No OS-default scrollbar chrome anywhere — every scrollable panel (equivalence table, event lines table, textareas, autocomplete dropdown) uses the themed thumb via `scrollbar-width`/`scrollbar-color` and `::-webkit-scrollbar`. Flat, no border or halo around the thumb — consistent with the Flat-Desk Rule.

## 6. Do's and Don'ts

### Do:
- **Do** keep Maple Amber (#e0993d) as the only saturated accent color on any given screen.
- **Do** render every number in JetBrains Mono and every label/control in Inter — no exceptions.
- **Do** convey elevation through the Ember Black → Warm Char → Warm Char Raised tonal ramp, not shadows.
- **Do** keep the sidebar's 2px left-border accent as the one legitimate use of a border-as-indicator, reserved for active-nav state only.
- **Do** keep Fredoka scoped to the "Mimi's Tools" wordmark only — it's a signature, not a second body/heading typeface.

### Don't:
- **Don't** reintroduce a purple/violet accent or a cool navy background — that reads as the generic "AI-generated dark tool" default this system was deliberately built to avoid.
- **Don't** use `border-left`/`border-right` as a decorative accent anywhere except the sidebar's active-tab indicator.
- **Don't** add card-grid layouts, stock icon sets, or KPI-tile patterns — this is a data-entry desk, not a SaaS dashboard.
- **Don't** add ad-hoc shadows to panels or table rows "for depth" — depth is tonal, not cast.
- **Don't** use a stock Tailwind-style mint-green or coral-red for success/error states — stay in the warmed Olive Success / Warm Red Error family.
