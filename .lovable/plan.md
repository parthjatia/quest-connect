## Goal
Make the existing "Your Event Wrapped" slideshow (`/wrapped` — the full-screen Spotify-Wrapped-style "You showed up." → XP → connections → top quest → AI insight slides) easy to reach again. The route and all its slides are still intact in `src/routes/wrapped.tsx` — they were just no longer linked from the Recap page.

## Change (one file)
**`src/components/recap/recap-shell.tsx`** — In `RecapHeader`, add a `<Link to="/wrapped">Wrapped</Link>` next to the existing "Profile" and "← Back to event" links. Same `text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground` styling as its siblings.

Clicking it opens the existing full-screen Wrapped experience exactly as before. The CTA card on `/play` (home tab → "Your Event Wrapped") also still works and is untouched.

## Out of scope
- No changes to `/wrapped` slides, data, styling, or behavior.
- No changes to `/recap`, `/play`, Profile link, Quey wordmark, or any other route/component.
- No new routes, no new components.
