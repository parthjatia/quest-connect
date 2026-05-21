# Dark Neon Redesign

Reskin the main app surfaces (Landing, Auth/Join, Play, Admin, Sponsor, Sponsor Radar) with a professional dark-purple/black palette, neon green+magenta accents, sharper straight-line geometry, and a real WebGL 3D shape drifting in the background of each page. Recap and Wrapped are left alone.

## Palette (added to `src/styles.css`)

- `--bg-base`: near-black `#0a0014`
- `--bg-deep`: deep purple `#1a0a2e`
- `--bg-mid`: violet `#2a0a3e`
- `--neon-green`: `#39ff14` (primary accent — headings, links, CTAs)
- `--neon-magenta`: `#ff2d87` (secondary accent — highlights, hover)
- `--neon-glow-green` / `--neon-glow-magenta`: blurred drop-shadow tokens for "shiny" text
- New utility classes: `.text-neon`, `.text-neon-magenta`, `.line-grid` (straight-line CSS grid backdrop), `.panel-dark` (sharp-cornered translucent card with neon border).

Replace soft blob gradients and rounded glow halos across the touched pages with straight-edged dividers, hairline neon borders, and tighter radii (`rounded-md` instead of `rounded-2xl` on chrome elements). Cards keep small rounding only where it aids legibility.

## 3D backgrounds (three.js)

Install `three` and add `src/components/three-bg.tsx` — a single reusable `<ThreeBackground variant="..." accent="..." />` component that:

- Mounts a fixed full-viewport `<canvas>` behind page content (`z-0`, `pointer-events-none`).
- Renders a low-poly wireframe scene with subtle auto-rotation and mouse parallax.
- Uses `IntersectionObserver` + `prefers-reduced-motion` to pause when off-screen or when the user prefers reduced motion.
- Disposes geometry/material/renderer on unmount.

Per-page variants (each page gets its own shape + accent):

| Route | Shape variant | Accent |
|---|---|---|
| `/` Landing | Slowly rotating wireframe icosahedron cluster | neon green |
| `/auth` + `/join` | Wireframe torus knot | neon magenta |
| `/play` | Drifting wireframe cube grid (tunnel) | neon green |
| `/admin` | Tilted wireframe octahedron lattice | neon magenta |
| `/sponsor` | Slow wireframe dodecahedron | neon green |
| `/sponsor-radar` | Concentric wireframe rings (radar) | neon magenta |

All variants share the same dark gradient base (`--bg-base` → `--bg-deep`) so the app feels cohesive while each window is visually distinct.

## Per-page edits

- **`src/routes/index.tsx`** — Swap the teal radial gradient for the new dark base, drop `FloatingDecor`, mount `<ThreeBackground variant="icosahedron" accent="green" />`, restyle the three portal cards as sharp-cornered panels with neon hairline borders and neon-glow CTAs (one card highlights magenta to preview the multi-accent system).
- **`src/routes/auth.tsx`** — New background + `ThreeBackground` (torus-knot, magenta). Inputs get sharp corners, neon focus rings, magenta submit button with green hover glow.
- **`src/routes/join.tsx`** — Same chrome as auth, torus-knot bg, magenta accent.
- **`src/routes/play.tsx`** — Cube-grid bg (green). Restyle section headers, cards, and the top header to the new palette. Existing functional pieces (vibe map, quests, leaderboard) keep their logic; only surface colors, borders, radii change.
- **`src/routes/admin.tsx`** — Octahedron-lattice bg (magenta). Table/list chrome moves to dark panels with neon dividers.
- **`src/routes/sponsor.tsx`** — Dodecahedron bg (green), restyled form panel.
- **`src/routes/sponsor-radar.tsx`** — Radar-rings bg (magenta), restyled rows.
- **`src/components/app-header.tsx`** — Update header bg/border to match new palette; logo uses neon-green gradient text with glow.

## Out of scope

- `/recap` (warm zine palette) and `/wrapped` (colorful slideshow) — untouched, per earlier intent.
- No business-logic, data, auth, or routing changes. Pure presentation pass.
- No changes to `Recap*` components, `wrapped.tsx`, server functions, or DB.

## Technical notes

- `bun add three` and `bun add -d @types/three` before any component imports it.
- `ThreeBackground` is client-only; route components import it directly (no SSR concern since these are interactive pages).
- Renderer uses `antialias: true`, `alpha: true`, `powerPreference: "high-performance"`, capped at `devicePixelRatio` of 1.5 to keep mobile cost low.
- All neon colors go through CSS tokens so future palette tweaks happen in one file.
