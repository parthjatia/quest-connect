# Onboarding revamp + gold coins

## 1. Gold coins (sitewide)

- Delete `src/assets/coin-blue.png` (the originally uploaded reference).
- Regenerate `src/assets/coin-cyan.png` and `src/assets/coin-navy.png` as
  two gold variants (bright gold, deep amber-gold) using the same retro
  3D coin look. Filenames stay the same so no import paths break.
- Edit `src/components/floating-decor.tsx`: drop the `coin-blue` import
  and remove it from the sprite pool. Other props (dice, joystick,
  cassette, star, diamond) stay untouched.

## 2. Onboarding `/` revamp (v1 "Arcade portal elite")

Rewrite `src/routes/index.tsx` to match the approved direction:

- Dark `bg-background` canvas, removes the existing top header bar
  (cleaner portal feel — "Quest Connect / demo" chrome goes away on
  this page only).
- Header block:
  - Gold "EVENT OS" pill (rounded, gold border + 10% gold fill).
  - 4xl extrabold headline "One event." / "Three lenses." with the
    second line as a cyan→blue gradient.
  - Subhead "Run it. Play it. Sponsor it."
- Three vertically stacked portal buttons (mobile-first, single column;
  on `sm+` they relax into the same stacked layout but max-width 480):
  - **Organizer** — cyan accent, cyan icon tile, blurred cyan/blue glow
    halo on hover, links to `/auth?mode=admin`.
  - **Attendee** — gold accent, gold icon tile, blurred gold/orange
    halo on hover, links to `/auth`.
  - **Sponsor** — slate accent, neutral icon tile, subtle halo, links
    to `/sponsor`.
  - Each card: `bg-slate-900/60` glass, `border-white/10`,
    `backdrop-blur-xl`, rounded-2xl, kicker label + bold title + blurb
    + arrow CTA, `active:scale-[0.98]`.
- Floating gold coin sprites + a faint cyan dice motif behind the
  cards (use the existing `FloatingDecor variant="ambient"` so it
  picks up the now-all-gold coin pool).
- Animated headlines via existing `AnimatedHeadline`.
- Footer: small "No accounts. No passwords. Walk in." line.

All colors use Tailwind tokens already available; no `styles.css`
changes required (the cyan/gold accents are arbitrary utility classes
matching the rest of the app's tokens). `<Link>` from
`@tanstack/react-router` is preserved for all three CTAs.

## Files

- delete: `src/assets/coin-blue.png`
- regen: `src/assets/coin-cyan.png`, `src/assets/coin-navy.png` (gold)
- edit: `src/components/floating-decor.tsx` (drop blue coin)
- edit: `src/routes/index.tsx` (full rewrite to v1 layout)

## Out of scope

No data, RLS, auth, server, or business-logic changes. Other pages
keep their current layout — only `/` is restyled.
