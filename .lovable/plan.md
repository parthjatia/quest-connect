# Simplify floating background decorations

## Goal
Replace the busy coin/joystick/dice/cassette/cassette/gem sprites currently floating across `/`, `/play`, and `/wrapped` with a minimal monochrome background: just 2–3 large, curvy geometric shapes slowly roaming. No color noise, no functional change.

## What changes

**Single file: `src/components/floating-decor.tsx`** — rewritten internals only. The exported component name, props (`variant`, `density`, `className`), and call sites stay identical, so `/`, `/play`, and `/wrapped` pick up the new look automatically.

New implementation:
- Drop all image imports (`coinCyan`, `coinNavy`, `diceRed`, `diceBlack`, `joystick`, `cassette`, `starBurst`, `diamondGem`) and the sprite-array logic.
- Render 2–3 inline SVG shapes per variant — soft organic blobs / curved arcs / a single ring — using `currentColor` set to white at low opacity (≈0.04–0.08) so they read as subtle texture on the dark background. No multi-color palette.
- Keep them roaming with the existing `animate-drift-a/b/c` keyframes (already in the project) — slow, large translate loops. Each shape gets a different drift class, scale, and animation-delay for variety.
- Variant mapping (functional parity, just visual simplification):
  - `ambient` (default) → 2 shapes, very low opacity
  - `dense` → 3 shapes, same low opacity
  - `coin-rain` → 3 shapes (we drop the literal "coin rain" cascade since it conflicts with the minimal direction); still uses the same drift motion so the `/` hero doesn't break
- Keep `pointer-events-none absolute inset-0 overflow-hidden` wrapper and `aria-hidden` so layout/accessibility are unchanged.
- Keep the `density` prop accepted (ignored in new design unless > 3, capped) so any caller passing it still type-checks.

## Out of scope
- No changes to `/`, `/play`, `/wrapped`, or any other route file.
- No removal of the asset PNGs themselves (left in `src/assets/` in case other components use them; a quick grep confirms only `floating-decor.tsx` imports them, but leaving the files avoids touching anything else).
- No new dependencies, no color tokens added.

## Why this approach
One-file edit, zero API change, all three screens update at once. Matches the "absolutely no change in functionality" constraint — props, variants, and component name are preserved.
