## 1. Pods in a compact window (admin)
File: `src/routes/admin.tsx`

Wrap the existing "Pods" section in the same compact scrollable container the Attendees table uses (`border border-border max-h-[480px] overflow-auto`). Each pod becomes a single-row entry with: pod name, member count badge, and a comma-separated list of member names + their 4-char verify codes — instead of the current full-grid cards. This matches the attendee table's visual density.

## 2. Remove /onboarding
- Delete `src/routes/onboarding.tsx`.
- In `src/routes/dashboard.tsx` (line 41), remove the `useEffect` that navigates to `/onboarding` when `me.data.onboarded` is false.
- The router tree (`routeTree.gen.ts`) will auto-regenerate.

## 3. Sponsor login + custom side quests with admin approval

### DB migration (one migration call)
Add to existing `quests` table:
- `created_by_sponsor text NULL` — sponsor handle that submitted it
- `approval_status text NOT NULL DEFAULT 'approved'` (values: `pending`, `approved`, `rejected`) — existing quests default to approved
- RLS: allow anon/auth `INSERT` only when `type='side'` AND `approval_status='pending'` AND `created_by_sponsor IS NOT NULL`

### Sponsor sign-in (`src/routes/auth.tsx`)
Add a third auth mode: `mode=sponsor`. Sponsor enters a handle (e.g. `sponsor1`) — no password, just stored in localStorage via a new helper `setLocalSponsor(handle)` in `src/lib/local-attendee.ts`. Add a switcher link "Are you a sponsor?".

### Sponsor dashboard (`src/routes/sponsor.tsx`)
Replace the current Sponsor Radar page content with a simple sponsor portal:
- Header showing sponsor handle + sign out
- Card "Propose a side quest" — form with title, description, emoji, points (5/10/15), submit button
- Card "My submitted quests" — lists this sponsor's quests with status badge (pending/approved/rejected)
- Guard: redirect to `/auth?mode=sponsor` if no local sponsor handle
- The existing Sponsor Radar feature is moved to `/sponsor-radar` (separate route file) so we don't lose it.

### Admin approval (`src/routes/admin.tsx`)
New section "Sponsor quest proposals" listing quests where `approval_status='pending'`. Each card: sponsor handle, title, description, points, Approve / Reject buttons that update `approval_status`.

### Attendee visibility
Update `src/routes/play.tsx` (and any other place quests are read for attendees) to filter `approval_status='approved'` so pending sponsor quests don't appear until approved.

## 4. Clear all attendees (admin)
New "Danger zone" button in admin header area:
- Confirms with `confirm("Delete ALL attendees, pods, verifications, completions and submissions? This cannot be undone.")`
- Runs deletes in order: `pod_verifications`, `completed_quests`, `group_quest_submissions`, `attendees`, then `groups` (cascade-safe order). Uses supabase client (RLS already allows anon/authed manage on these).
- Toast on success; invalidates `admin-attendees`, `admin-groups`, `admin-pending-submissions`.

## Out of scope
- No password protection for sponsors (mirrors current attendee 4-char-code simplicity).
- No email notifications for approvals.
- Sponsor Radar moves to `/sponsor-radar`; not deleted.
