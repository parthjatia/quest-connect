## Plan: Branding rename, vibe map fixes, attendee profile route

### 2. Rename "Quest Connect" → "Quey" (bolder, more visible)
- Replace the literal string `Quest Connect` in:
  - `src/components/app-header.tsx`
  - `src/components/recap/recap-shell.tsx`
  - Any `head()` titles / meta in `src/routes/index.tsx`, `auth.tsx`, `join.tsx`, `play.tsx`, `admin.tsx`, `sponsor.tsx`, `sponsor-radar.tsx`, `recap.tsx`, `wrapped.tsx` that mention "Quest Connect".
- Make the header wordmark bolder: change `font-bold text-lg` → `font-extrabold text-xl tracking-tight` in `app-header.tsx`; same `font-extrabold tracking-tight` upgrade on the recap shell wordmark. No color or token changes.

### 3. Vibe Map — fix unreadable chip labels in "Suggested for you"
- In `src/components/vibe-map/vibe-map-section.tsx`, locate the active filter chips that render dark text on the lime background.
- Change ONLY the chip label text class (e.g. `text-primary-foreground` / dark token) → `text-white`. Leave the subtitle and everything else alone.

### 4. Vibe Map — "you" dot color on map
- In `src/components/vibe-map/floorplan.tsx`, the `isYou` marker currently uses `oklch(0.9 0.22 130)` (lime).
- Change ONLY that fill to a blue matching the legend (`oklch(0.7 0.18 250)`). Keep the legend swatch as it is, keep the `bestZone` ring lime, keep stroke/glow logic untouched.

### 5. Attendee profile route — back-button only
- Create `src/routes/profile.tsx` as a simple read-only attendee profile page (loads current attendee via `getLocalAttendee()` and renders their fields). No edit controls.
- Add a "Profile" / back-style link in the Recap header (`recap-shell.tsx`) so users can navigate from `/recap` → `/profile`. The new profile page itself only shows a back link to `/recap` (no edit button).

### 6. Landing kicker "Event OS" → "Quey"
- In `src/routes/index.tsx`, replace the `Event OS` string inside the yellow pill with `Quey`. Keep all existing styling.

### Out of scope
- No design token / color system changes.
- No functionality changes (auth, matchmaking, recap generation, DB).
- No floating-decor edits.
- No edits to sign-up photo flow (item 1 already skipped).
