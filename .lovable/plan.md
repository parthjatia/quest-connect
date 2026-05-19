# Main-quest proofs require admin approval

Currently main-quest claims call `claim_quest_anon` which inserts with `verification_status='auto'` and immediately recalcs points. Switch to a pending → admin review flow, matching how side quests already work.

## Changes

### 1. Migration: two new RPCs

- `claim_main_quest(_attendee_id, _quest_id, _photo_url)` — inserts/upserts into `completed_quests` with `verification_status='pending'`, photo stored, **no** `recalc_attendee_points` call. ON CONFLICT updates the photo and resets status to pending (allows resubmit after rejection).
- `review_main_quest(_completed_id, _approve, _note)` — sets status to `approved` or `rejected`, stamps `verified_at`, sets `reviewer_note`, and calls `recalc_attendee_points` only on approve.

`recalc_attendee_points` already counts only `('auto','approved')`, so pending rows correctly contribute zero XP.

### 2. `src/routes/play.tsx` — MainQuestClaimDialog

- Switch RPC call from `claim_quest_anon` to `claim_main_quest`.
- Toast: "Submitted — waiting for admin review" (not "+XP awarded").
- In `MainQuestTimeline`, render three states based on `completed_quests.verification_status`:
  - `pending`: photo + "Awaiting admin review" yellow chip, no XP claimed yet.
  - `approved`: photo + "+N XP awarded" lime chip (today's done state).
  - `rejected`: photo + "Rejected — {reviewer_note}" + Resubmit button reopening the dialog.
- "Current" detection: treat only quests with no completion OR a `rejected` completion as claimable; a `pending` row blocks resubmit until reviewed.

### 3. `src/routes/admin.tsx` — new `PendingMainQuestQueue`

New section above or beside `PendingSubmissionsQueue` (mirrors its structure):
- Query `completed_quests` joined with `quests` (where `quests.type='main'`) and `attendees(full_name)`, ordered by `claimed_at desc`, limit 50.
- Realtime channel on `completed_quests` to invalidate.
- For each row show: attendee name, quest title/emoji, photo, status chip. Pending rows get Approve / Reject buttons calling `review_main_quest`. On reject, prompt for an optional note.
- On approve: toast "+N XP awarded to {name}"; invalidate admin attendees + this queue.

### 4. No change to `claim_quest_anon`

Leave the function in place (sponsor/legacy paths may reference it) but stop calling it from main-quest UI.

## Out of scope

- Side-quest flow (already admin-approved, working).
- Sponsor flow (already sponsor-approved, working).
- Backfill of any existing `verification_status='auto'` main-quest rows — DB shows zero completions today.
