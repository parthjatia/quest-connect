## Goal
Apply the Wrapped visual language across the entire app, in a navy-blue base with cyan-blue accents. Gradient swooshes used as accents only (hero sections, key CTAs, badges, progress bars). Typography: big extrabold display headlines + uppercase tracked kickers on every page; body text stays as-is.

## Visual system (locked, used everywhere)

**Base colors** — update `src/styles.css` `:root`:
- `--background`: deep navy `oklch(0.14 0.05 250)` (was near-black, now distinctly navy)
- `--card` / `--popover` / `--sidebar`: slightly lighter navy panels
- `--primary`: electric blue (kept)
- `--accent`: cyan `oklch(0.82 0.13 215)` (slightly brighter, used for kicker text and accents)
- `--gradient-mesh`: subtle navy → cyan-blue radial wash (replaces current mesh, no purple/magenta)

**Wrapped-style "swoosh" gradients** — promoted from `wrapped.tsx` constants into shared utility classes in `src/styles.css`, all retuned to navy + cyan family (no magenta/lime/coral):
- `.bg-swoosh-1` radial bottom-left: cyan → indigo → navy
- `.bg-swoosh-2` radial top-right: sky → teal → navy
- `.bg-swoosh-3` conic warm-cool blue
- `.bg-swoosh-4` radial bottom-right: cyan → violet-blue → navy
- `.bg-swoosh-5` ellipse: ice-blue → electric → navy
- `.bg-swoosh-6` radial top: cyan → emerald-teal → navy
Used sparingly — one per hero band, one per featured card.

**Typography utilities** (new in `src/styles.css`):
- `.wrapped-kicker` — `text-[11px] uppercase tracking-[0.3em] font-semibold opacity-90`
- `.wrapped-headline` — `font-extrabold leading-[0.95] tracking-tight` with `clamp()` font-size matching wrapped.tsx
- `.wrapped-headline-md` — smaller variant for cards/sections

## Page-by-page application (presentation layer only — no logic changes)

For each page below: swap the hero/header block to use `wrapped-kicker` + `wrapped-headline`, apply a single `.bg-swoosh-*` to the hero band, keep the rest of the layout intact. No content, data fetching, or routing changes.

1. `src/routes/index.tsx` — landing hero gets kicker + huge headline + swoosh-1 background
2. `src/routes/play.tsx` — dashboard top header gets kicker ("Your event") + headline (attendee name); the Event Wrapped CTA button retoned to swoosh-4
3. `src/routes/auth.tsx` — sign-in card gets swoosh-2 background, kicker + headline
4. `src/routes/join.tsx` — kicker + headline + swoosh-5
5. `src/routes/admin.tsx` — admin header kicker + headline, swoosh-6 on top band
6. `src/routes/sponsor.tsx` + `src/routes/sponsor-radar.tsx` — kicker + headline, swoosh-3
7. `src/routes/recap.tsx` — kicker + headline, swoosh-2
8. `src/routes/wrapped.tsx` — switch its inline GRADIENTS array to the new `.bg-swoosh-*` set so it stays in family

## Files touched
- `src/styles.css` — new navy base tokens, swoosh utilities, typography utilities
- `src/routes/index.tsx`, `play.tsx`, `auth.tsx`, `join.tsx`, `admin.tsx`, `sponsor.tsx`, `sponsor-radar.tsx`, `recap.tsx`, `wrapped.tsx` — header/hero swap only

## Out of scope
- No body-typography changes, no layout restructuring, no component-library swaps
- No data, auth, RLS, or server-function changes
- No new pages/routes