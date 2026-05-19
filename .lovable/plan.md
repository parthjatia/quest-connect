## Goal

Rework the right-side panel of the Vibe Map and the "All zones" grid so the information is more scannable and visually tied to the heatmap above.

Scope: `src/components/vibe-map/vibe-map-section.tsx` only. No data, logic, or backend changes — purely presentation.

## Changes

### 1. Replace the dense "Best move right now" panel with 3 separate bubbles

The single card that currently stacks header + metrics + shared tags + top matches + icebreaker becomes three stacked rounded "bubble" cards in the right column:

**Bubble A — Stats (column chart)**
- Heading: "Best move right now" (or "Selected zone" when manual), zone name, and the existing "Back to best zone" link.
- Replace the `MetricRow` list with a small column/bar chart showing three bars:
  - Total match strength (`focused.totalScore`)
  - Matching people (`focused.matchingCount`)
  - Average score (`focused.averageScore`)
- Each bar shows its numeric value on top and its label underneath. Bars share a normalized height (each scaled against its own sensible max so they're comparable visually: strength vs pool max, count vs pool max, avg out of 100). Pure CSS/flex divs styled with the existing `lime` accent — no chart library.
- Keep the short "Best because…" / anonymous-count caption beneath the chart.

**Bubble B — Top matches**
- Separate rounded card with its own header "Top matches there".
- Renders the same `focused.topMatches` list and the existing "Only anonymous people…" empty state. No new fields.
- Keeps the "I'm heading to {zone}" button at the bottom of this bubble (it's match-list related action).

**Bubble C — Step 3 · Your icebreaker** (unchanged)
- Keep the current `action` card exactly as-is.

Note: the "Strongest shared" tags row currently sits between metrics and top matches. It moves into Bubble B as a small chip row above the matches list (keeps related info together; no content removed).

### 2. Group "All zones" by heat level, color-linked to the heatmap

Replace the single 4-column grid with four labeled subgroups, one per heat level, in the order used by the floorplan legend: **very hot → hot → warm → cold**.

- Each subgroup gets a header row with a colored dot + heat label + count, using the exact same color tokens the floorplan uses so the zones visually echo the map:
  - very-hot → `oklch(0.72 0.24 25)` (red)
  - hot → `oklch(0.8 0.2 55)` (orange)
  - warm → `oklch(0.86 0.16 90)` (yellow)
  - cold → `oklch(0.5 0.06 250)` (cool blue/gray)
- Each zone card inside a group keeps its current content but gains a left border / accent in its group's color, so when the user looks at the heatmap and then this section the colors match 1:1.
- Empty groups are hidden.
- Cards remain clickable and continue to drive `selectedZone` (unchanged behavior; selecting still updates the right-column bubbles and floorplan highlight).

### 3. Small helper additions (same file)

- A `StatBar` subcomponent for the column chart bars.
- A `HEAT_COLOR` map (heat → oklch string) reused by group dots and card accents.
- The existing `HeatPill` stays for in-card use.

## Out of scope

- Floorplan component, data adapters, suggestions panel, filters row, flow steps, zone selector, and all logic in `useMemo` / handlers stay untouched.
- No new dependencies (no Recharts) — a tiny flex-based bar chart is enough and matches the current minimal aesthetic.
