Two small UI changes:

### 1. Floorplan — add visible heat bubbles per zone
File: `src/components/vibe-map/floorplan.tsx`

Inside each zone rect, render a small cluster of solid colored bubbles that match its heat level (so the heat is unmistakable, not just a tinted fill):
- `very-hot` → 3 small red circles (oklch 0.72 0.24 25)
- `hot` → 2 orange circles (oklch 0.8 0.2 55)
- `warm` → 1 yellow circle (oklch 0.86 0.16 90)
- `cold/quiet` → 1 small dim blue dot (oklch 0.5 0.06 250)

Bubbles render at the bottom-center of each zone rect, each ~r=0.7 in viewBox units, with a soft white stroke for contrast and using the existing `vibe-glow` filter so hot ones glow. The `you` lime dot and `best zone` animated ring stay as-is. Legend already lists all categories.

### 2. Prominent Recap CTA on /play
File: `src/routes/play.tsx`

Add a big call-to-action card right under the profile/verify-code section linking to `/recap`. Styling: dark glass card with cyan/lime gradient, `Sparkles` icon, headline "Personalized Visual Recap", short subline, and a primary button "Open recap →". Uses TanStack `Link to="/recap"`.

No backend/data changes. Recap feature itself already exists at `/recap`.
