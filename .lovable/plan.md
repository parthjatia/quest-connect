## Problem
"Clear all" in `/admin` calls `supabase.from(...).delete()` from the browser with the anon key. RLS on `attendees`, `completed_quests`, `attendee_meets`, `pod_verifications`, `quest_transcripts`, and `group_quest_submissions` has **no DELETE policy for anon** — only `admins manage attendees` (authenticated + admin role) can delete. The request succeeds with 0 affected rows, so the UI shows "Everything cleared" but the data stays.

## Fix
Move the wipe to a server function that uses the **admin client** (`supabaseAdmin`, service role, bypasses RLS). This is the right boundary for a destructive admin action and avoids loosening RLS.

### Changes

1. **New file** `src/lib/admin.functions.ts`
   - `clearAllDataFn = createServerFn({ method: "POST" }).handler(...)` that, using `supabaseAdmin`, deletes from (in order): `pod_verifications`, `attendee_meets`, `completed_quests`, `group_quest_submissions`, `quest_transcripts`, `attendees`, `groups`, `quests`.
   - Returns `{ ok: true }`.
   - (No auth middleware for now — matches the existing anon-admin pattern in this project. If you want it gated to admins, say so and I'll add `requireSupabaseAuth` + role check.)

2. **Edit** `src/routes/admin.tsx` `clearAllAttendees`
   - Replace the 8 inline `supabase.from(...).delete()` calls with a single `useServerFn(clearAllDataFn)()` call.
   - Keep the existing confirm dialog, toast, and `qc.invalidateQueries` for all admin keys.

### Out of scope
- No RLS changes.
- No changes to seed/import/matchmaker.
- Not touching `event_settings` or `user_roles`.