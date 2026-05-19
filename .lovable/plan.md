## Goal
1. Lighten the global background across all dark screens.
2. Let attendees attach a profile photo — both during onboarding (`/join`) and editable later from the profile card on `/play`.

## Part 1 — Lighter background (global)

Bump the `--background` token in `src/styles.css` from `oklch(0.14 0.05 250)` to roughly `oklch(0.20 0.05 250)`. This auto-lightens every screen that uses `bg-background` (play, join, auth, sponsor, admin) without touching any component.

Also nudge `--card` slightly (`0.19 → 0.24`) so panels stay visually one step above the new background. Cyan-gradient screens (onboarding root, login screens) use their own radial gradient and stay as-is.

## Part 2 — Profile photo

### Backend
- **Migration**: add `avatar_url text` column to `public.attendees`.
- **Migration**: create a public `avatars` storage bucket with policies allowing anyone to read, and anon + authed users to insert/update objects (matches the existing anon-friendly RLS model used by other tables in this app).

### Onboarding (`/join`)
Add an optional avatar picker at the top of the form:
- Circular dropzone showing either the chosen image preview or a camera icon.
- Hidden `<input type="file" accept="image/*">`; on change, upload to `avatars/{uuid}.{ext}` via `supabase.storage`, store the public URL in component state.
- On submit, include `avatar_url` in the `attendees` insert payload.

### Play screen (`/play`)
On the profile card (around line 271 of `play.tsx`):
- Render an avatar circle next to the attendee name. Uses `me.data?.avatar_url` if present, falls back to the first initial in a styled circle.
- Small hover/tap overlay with a camera icon opens a hidden file input. On change:
  1. Upload to the `avatars` bucket.
  2. `update` the attendee row's `avatar_url`.
  3. Invalidate the `["me", attendee.id]` query so the new image appears.
- Show a tiny inline spinner while uploading; toast on success/failure.

### Validation
- Reject files >5 MB.
- Reject non-image MIME types (client-side check before upload).

## Files to change
- `src/styles.css` — lighten `--background` and `--card` tokens
- `src/routes/join.tsx` — avatar picker + include `avatar_url` in insert
- `src/routes/play.tsx` — avatar display + change-photo control on profile card
- Migration: add `attendees.avatar_url` column + create `avatars` bucket and policies

## Out of scope
- No changes to the onboarding `/` landing or auth screens' radial gradients (these are intentional cyan-glow backdrops, not `bg-background`).
- No changes to the photo elsewhere (leaderboard, pod list) — can be added later if you want.