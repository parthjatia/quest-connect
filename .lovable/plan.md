# Retro arcade vibe: coins, dice, animated text, moving hues

Bring the dashboard to life with a rainfall of cyan coins, tumbling red & black dice, and other retro doodads drifting across the UI. Make headlines animate in, and let the swoosh hue blocks subtly shift their color over time.

## 1. Assets

- Copy the uploaded blue coin to `src/assets/coin-blue.png` (use as-is for the hero "coin rain").
- Generate 2 sibling coin variants with `imagegen` (transparent PNG, premium quality, white bg in prompt):
  - `src/assets/coin-cyan.png` — lighter cyan/teal coin, same 3D chrome style.
  - `src/assets/coin-navy.png` — darker navy/electric-blue coin, same style.
- Generate retro props (transparent PNG):
  - `src/assets/dice-red.png` — glossy 3D red die showing 5.
  - `src/assets/dice-black.png` — glossy 3D black die showing 3, white pips.
  - `src/assets/joystick.png` — retro arcade joystick, red ball top, chrome base.
  - `src/assets/cassette.png` — retro cassette tape, cyan label.
  - `src/assets/star-burst.png` — chunky 8-bit cyan star.
  - `src/assets/diamond-gem.png` — faceted blue gem.

## 2. New component: `FloatingDecor`

`src/components/floating-decor.tsx` — absolutely-positioned, `pointer-events-none`, `aria-hidden` layer that renders a configurable set of floating sprites.

- Props: `variant: "coin-rain" | "ambient" | "dense"`, `density?: number`, `className?`.
- Internally randomizes positions, sizes (28–80px), rotation, animation delay/duration per sprite using a stable seed (so SSR + client match — use `useMemo` with index-based deterministic values, not `Math.random()` at render).
- Sprite types:
  - **coin-rain**: coins fall top→bottom, slow rotate, fade in/out (used over hero/attendee block).
  - **ambient**: dice, joystick, cassette, gems drift in lazy figure-8 loops at low opacity (used as page background layer).
  - **dense**: combines both for the Wrapped CTA / Event Wrapped page.

## 3. New CSS in `src/styles.css`

Add keyframes + utilities (all GPU-friendly — `transform` + `opacity` only):

- `@keyframes coin-fall` — translateY(-20vh → 110vh) + rotate 0→360deg, 8–14s linear infinite.
- `@keyframes coin-spin` — rotateY(0→360deg), 3s linear infinite (for static showcase coins).
- `@keyframes drift-a` / `drift-b` / `drift-c` — long meandering translate+rotate loops 18–28s.
- `@keyframes hue-shift` — `filter: hue-rotate(0 → 25deg → 0)` over 12s, applied to `.bg-swoosh-*` wrappers via new `.hue-drift` utility.
- `@keyframes text-rise` — opacity 0→1, translateY(14px→0), 0.7s ease-out (one-shot, used on headlines).
- `@keyframes text-shimmer` — background-position sweep for gradient text on the main attendee name.
- `@keyframes letter-pop` — staggered per-letter scale-in for the dashboard greeting.
- New utilities: `.animate-coin-fall`, `.animate-spin-slow`, `.animate-drift-a/b/c`, `.hue-drift`, `.animate-text-rise`, `.animate-text-shimmer`, `.animate-letter-pop`.

## 4. Animated text helper

`src/components/animated-text.tsx`:
- `<AnimatedHeadline>` — splits children into spans per word/letter and applies `.animate-letter-pop` with `style={{ animationDelay: `${i*40}ms` }}`.
- `<ShimmerText>` — wraps gradient text with `.animate-text-shimmer`.
- Used on the Home tab "hello, {name}" headline, Quests tab title, Vibe tab title, and Wrapped slide titles.

## 5. Wire decor + animations into routes

Touch these files only — no logic changes, decor is purely presentational and behind content (`-z-0` with content `relative z-10`):

- **`src/routes/play.tsx`**:
  - Wrap outer container: add `<FloatingDecor variant="ambient" />` once at the top.
  - Home tab: add `<FloatingDecor variant="coin-rain" />` inside the attendee profile card (overflow-hidden); apply `.hue-drift` to the `bg-swoosh-4` class; swap the attendee name + XP headline to `<AnimatedHeadline>`; add `.animate-spin-slow` showcase coin next to the XP number using `coin-blue.png`.
  - Quests tab: `.hue-drift` on leaderboard card; small spinning coin on the gold/silver/bronze rank badges (use blue/cyan/navy coin variants behind the emoji).
  - Vibe tab: ambient drift only.
  - Bottom-nav active tab icon: gentle bounce via `.animate-letter-pop` on activation.
- **`src/routes/wrapped.tsx`**: add `<FloatingDecor variant="dense" />` per slide; `.hue-drift` on the swoosh background; all slide headlines use `<AnimatedHeadline>` re-keyed per slide so the animation replays on advance.
- **`src/routes/index.tsx`**, **`auth.tsx`**, **`join.tsx`**, **`admin.tsx`**, **`sponsor.tsx`**, **`sponsor-radar.tsx`**: add `<FloatingDecor variant="ambient" />` to the hero band, `.hue-drift` on swoosh backgrounds, `<AnimatedHeadline>` on the H1.

## 6. Performance + a11y guardrails

- All decor wrappers use `pointer-events-none aria-hidden="true"`.
- All keyframes wrapped in `@media (prefers-reduced-motion: no-preference)`; under `reduce`, sprites render static at low opacity and hue-shift/text animations are disabled.
- Decor sprite count caps: ambient = 8, coin-rain = 14, dense = 18. Sprites use `loading="lazy"` and `decoding="async"`.
- All sprites `will-change: transform` while animating only (via the animation utility class, not globally).

## Files

- new: `src/assets/coin-blue.png`, `coin-cyan.png`, `coin-navy.png`, `dice-red.png`, `dice-black.png`, `joystick.png`, `cassette.png`, `star-burst.png`, `diamond-gem.png`
- new: `src/components/floating-decor.tsx`, `src/components/animated-text.tsx`
- edit: `src/styles.css` (add keyframes + utilities, no token changes)
- edit: `src/routes/play.tsx`, `src/routes/wrapped.tsx`, `src/routes/index.tsx`, `src/routes/auth.tsx`, `src/routes/join.tsx`, `src/routes/admin.tsx`, `src/routes/sponsor.tsx`, `src/routes/sponsor-radar.tsx`

## Out of scope

No data, RLS, auth, server-function, or business-logic changes. Pure presentation layer.
