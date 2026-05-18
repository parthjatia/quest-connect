# Simplify EventQuest: No-Auth Demo Mode

Goal: two windows total. Pick a role on landing → land directly inside the one event. Admin gets full control, attendee just types a name and is in.

## New flow

```
/  (landing: two big cards)
 ├── "I'm the Admin"     → /admin
 └── "I'm an Attendee"   → /join  → /play
```

No email, no password, no Supabase Auth. Single global event lives in the DB.

## Window 1 — Landing (`/`)

Replace current marketing index with a vibrant two-card chooser:
- Left card: "Admin / Organizer" → `/admin`
- Right card: "Attendee / Player" → `/join`
- Energetic gradient bg, big emoji, hover lift.

## Window 2a — Admin (`/admin`)

No login. Direct access (demo mode). Single page with tabs/sections:
- **Quests**: list + add/edit/delete (title, emoji, points, main/side)
- **Attendees**: live list with name, points, photos claimed
- **Matchmaker button**: groups attendees (heuristic for now, AI later)
- **Event Summary button**: shows current totals + leaderboard

## Window 2b — Attendee join (`/join`) then (`/play`)

- `/join`: single input "What's your name?" → button "Join the Event"
  - Inserts an attendee row with just `full_name`, stores the new `attendee_id` in `localStorage`
  - Redirects to `/play`
- `/play`: the dashboard
  - Shows their name + points
  - Lists all quests
  - Each quest has a "Claim" button → upload photo dialog → calls `claim_quest`
  - Shows AI feedback under claimed quests (keep existing Gemini call)

## Data model changes

Currently `attendees.user_id` is `NOT NULL` and tied to `auth.users`. For demo mode:
- Make `user_id` nullable
- Add anonymous insert policy on `attendees` (anyone can insert a row with just a name)
- Add anonymous insert policy on `completed_quests` (matched by `attendee_id` from localStorage)
- Open `quests` read to anon
- Open `quest-photos` bucket writes to anon (path = `anon/{attendee_id}/...`)
- Admin route is unprotected (demo mode) — no role check

The `handle_new_user` trigger stays but becomes unused (no signups).

## Files

**New**
- `src/routes/index.tsx` — replace with role chooser
- `src/routes/join.tsx` — name-only signup
- `src/routes/play.tsx` — attendee dashboard (port of `dashboard.tsx`, read attendee from localStorage)
- `src/lib/local-attendee.ts` — tiny helper for localStorage attendee id

**Modified**
- `src/routes/admin.tsx` — strip auth gate, work as single-event control panel
- `src/routes/__root.tsx` — remove auth-aware header, keep simple branded header
- New migration: nullable user_id + anon RLS policies + storage policy

**Keep but unused for now**
- `src/routes/auth.tsx`, `src/routes/onboarding.tsx`, `src/routes/wrapped.tsx` (we'll wire wrapped back in later)
- `src/hooks/use-auth.ts`

## What I will NOT touch this round
- Wrapped/final artwork flow
- Matchmaker LLM upgrade (keep heuristic visible in admin)
- Icebreakers (skip — no onboarding form)

After approval I'll run the migration, then build the 3 routes + simplified admin in one pass.
