## Restyle: Graphite + Indigo, with light/dark toggle everywhere

Drop the neon palette entirely. Move to a calm monochrome system with a single indigo accent, in both dark and light. Add a fixed corner toggle on every page. Put animated/sliding text on solid backgrounds with hairline frames so it's actually readable.

### 1. New design tokens (`src/styles.css`)

Replace the existing `:root` and add a `.light` variant. One accent, neutrals everywhere else.

Dark (default, `:root`):
- `--background: #0e1116`
- `--foreground: #f7f7f8`
- `--card: #14181f`
- `--muted: #1b2029`, `--muted-foreground: #9aa0a6`
- `--border: rgba(255,255,255,0.08)`
- `--primary: #4f6bed`, `--primary-foreground: #ffffff`
- `--ring: rgba(79,107,237,0.55)`

Light (`.light` class on `<html>`):
- `--background: #f7f7f8`
- `--foreground: #0e1116`
- `--card: #ffffff`
- `--muted: #eef0f3`, `--muted-foreground: #5a6270`
- `--border: rgba(14,17,22,0.10)`
- `--primary: #4f6bed`, `--primary-foreground: #ffffff`
- `--ring: rgba(79,107,237,0.45)`

Cleanup:
- Delete all `bg-neon-*`, `text-neon*`, `panel-neon*`, `.bg-lime`, `.text-lime`, `.border-lime`, the magenta accent, and `text-neon-shine`.
- Delete the `bg-neon-base *` blanket transition override and the `border-radius: 0 !important` overrides — let radius be a normal token (`--radius: 0.5rem`).
- Keep `--radius` modest but not zero — square-corner mandate from the previous turn is dropped along with neon.

### 2. Theme provider + toggle

New `src/components/theme-toggle.tsx`:
- `useTheme` hook backed by `localStorage` key `quey-theme` (`"light" | "dark"`, default `dark`).
- On mount, read storage and set `document.documentElement.classList.toggle("light", theme === "light")`.
- Renders a fixed button: `position: fixed; top: 16px; right: 16px; z-index: 50`, square-rounded, `bg-card` + `border`, sun/moon icon from `lucide-react`.

Mount once globally in `src/routes/__root.tsx` so it appears on every route automatically — no per-page wiring needed.

### 3. Remove the 3D neon backgrounds

- Delete `<ThreeBackground />` usage from `index.tsx`, `auth.tsx`, `play.tsx`, `admin.tsx`, `sponsor.tsx`, `sponsor-radar.tsx`, `join.tsx`.
- Delete `src/components/three-bg.tsx`.
- Uninstall `three` and `@types/three`.

Pages render directly on `bg-background` with no decorative shape overlays. No grid overlays. Just clean type and panels.

### 4. Per-page chrome pass

For each of: `index.tsx`, `auth.tsx`, `play.tsx`, `admin.tsx`, `sponsor.tsx`, `sponsor-radar.tsx`, `join.tsx`, `profile.tsx`:
- Replace `bg-neon-base` → remove (root `bg-background` from body takes over).
- Replace `panel-neon` / `panel-neon-magenta` → `bg-card border border-border rounded-lg`.
- Replace `text-neon`, `text-neon-magenta`, `text-neon-shine` → `text-foreground` for headings, `text-primary` only where a real accent is warranted (one accent per screen max — primary CTA, active state).
- Replace inline hex strings (`#39ff14`, `#ff2d87`, `#0a0014`, etc.) → token classes.
- Landing portal tiles: `bg-card`, hairline border, no glow halos, hover = `border-primary/50` only.
- Header (`app-header.tsx`): drop the neon shine wordmark + glow halo; use `text-foreground` + small `text-primary` mark.

### 5. Animated/sliding text → solid + hairline frame

Anywhere text animates (typewriter, sliding, recap reels, wrapped slides, `AnimatedHeadline`):
- Wrap the animating region in a container with `bg-background border border-border rounded-md p-4` (or `bg-card` if the page bg is already `bg-background`).
- Specifically audit and fix:
  - `src/components/animated-text.tsx` consumers in `index.tsx` (headline)
  - `src/components/recap/*` (slide canvases)
  - `src/routes/wrapped.tsx` (slide canvases)
- Remove `bg-swoosh-*` gradients and `recap-bg` radial mesh used behind animated copy. Replace with solid `bg-card` and the hairline border. Keep transitions between slides, just on a solid base.

### 6. Out of scope

- No business logic, routing, auth, data, or DB changes.
- `/recap` and `/wrapped` slide *content* and timing untouched — only their backgrounds and frame styling change.
- Type system, fonts (Space Grotesk + Inter) unchanged.

### Technical notes

- `__root.tsx` reads stored theme during the shell render to avoid a first-paint flash; inline a tiny script in `<head>` that sets `documentElement.classList` from `localStorage.getItem('quey-theme')` before React hydrates.
- The toggle button is rendered inside `RootComponent` (after the head script), not in the head, so it stays a regular React component.
- `bun remove three @types/three` to keep the bundle clean.
- All color usage in components must go through tokens (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary`, `bg-primary`). No raw hex in JSX.
