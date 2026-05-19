## Goals

1. Wipe the database to a clean slate (0 attendees, 0 quests, 0 side quests, 0 pods, 0 submissions, 0 verifications, 0 meets, 0 completions).
2. Add a one-click "Seed 100 mock attendees" button in admin that inserts 100 rows from `src/lib/mock-attendees.ts` instantly.
3. Keep "Clear all" wiping everything (attendees + quests + pods + dependent rows) so the admin can fully reset.
4. Pods table in admin only renders after matchmaking has produced groups (already the case via `podCount > 0`, but make this explicit and add an empty-state hint so it's clear pods appear only post-matchmaking).

## Part 1 — Database wipe (one-time)

Run a data delete (no schema change) that clears:
- `pod_verifications`, `attendee_meets`, `completed_quests`, `group_quest_submissions`, `quest_transcripts`
- `attendees`, `groups`
- `quests` (both main + side)

`event_settings` and `user_roles` are left intact.

## Part 2 — "Seed 100 mock attendees" button

**Location**: `src/routes/admin.tsx`, in the Attendees section header next to "Clear all".

**Behavior**:
- Inserts the first 100 entries from `MOCK_ATTENDEES` (`src/lib/mock-attendees.ts`) into the `attendees` table in one bulk `supabase.from("attendees").insert([...])` call.
- Maps each mock row to DB columns:
  - `full_name` ← `name`
  - `university` ← `university`
  - `academic_background` ← `background`
  - `ai_experience` ← lowercase of `ai_level` mapped to enum (`beginner` / `intermediate` / `power_user`)
  - `track_intent` ← reverse-mapped from track label to enum key (using `TRACK_OPTIONS` in `src/lib/attendee-options.ts`)
  - `event_goal` ← reverse-mapped from goal label to enum key
  - `track` ← original label (kept for legacy `track` column)
  - `user_id` ← `null` (anon rows; RLS `anon insert attendee` policy allows this)
  - `late` ← `false`, `points` ← `0`, `group_id` ← `null`
- Toast on success ("Seeded 100 mock attendees"); invalidates `admin-attendees` query.
- Confirm dialog if any attendees already exist.

## Part 3 — Pods visibility

Current code already gates the Pods section with `{podCount > 0 && ...}`. Make it stricter:
- Pods section only renders when `groups.data` has rows AND at least one attendee has a `group_id` (i.e. matchmaking has actually assigned members).
- Add a small caption under the Matchmaker card: "Pods appear after matchmaking is run."

## Out of scope

- No DB schema changes.
- No changes to matchmaker logic or signup form.
- Mock list isn't expanded — uses the first 100 from the existing 904-line mock file.

## Technical notes

- The wipe uses the data-change tool (not a migration) since it's row deletion only.
- Seed insert is a single client-side call from `admin.tsx` using the existing anon `supabase` client; no server function needed.
- Reverse-mapping helpers (label → enum key) added to `src/lib/attendee-options.ts` if not already present.
