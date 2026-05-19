# Fix XP Flow End-to-End

## What's broken today

1. **Main quests have no claim UI.** The timeline shows them but there's no "submit proof" button, so users can never earn the points the admin set on a main quest. `completed_quests` is empty in the database.
2. **Users can't see their XP.** `/play` never renders `me.data.points`. Even when side-quest approval or sponsor approval awards points (those backend paths work), the user has no number to watch go up.
3. **Sponsor approvals don't refresh the player UI.** Realtime only subscribes to `pod_verifications`, `group_quest_submissions`, and `groups` — not `completed_quests`. When a sponsor approves a submission, the player keeps seeing "pending" until manual reload.
4. **No celebration when XP lands.** A toast on point change makes "I got XP" obvious for the demo.

## Changes

### 1. Main-quest proof + auto-award (frontend only — RPC already exists)

The `claim_quest_anon(_attendee_id, _quest_id, _photo_url)` RPC already validates the photo, inserts into `completed_quests` with `verification_status='auto'`, and calls `recalc_attendee_points`. Wire it up:

- Add a "Submit proof" button on each main-quest card in `MainQuestTimeline` (when not yet completed and `kind !== "upcoming"` — only the current one is claimable, matching existing gating).
- New `MainQuestClaimDialog` (mirrors `GroupSubmitDialog`): camera/file upload → upload to `quest-photos` bucket under `attendees/{attendeeId}/{questId}-{ts}.{ext}` → call `supabase.rpc("claim_quest_anon", { _attendee_id, _quest_id, _photo_url })` → invalidate `["completed"]`, `["me"]`.
- Once completed, show the submitted photo + "Approved · +N XP" chip (data already in `completed_quests.quest_photo_url`).

### 2. XP total widget on /play

In the profile section header (right column near the verify code), render a prominent XP block:

- Big number: `me.data.points` with label "Total XP".
- Small breakdown line: `quests · pod bonus · meet bonus` derived from `points - pod_bonus_points - meet_bonus_points` for quest XP.
- Animate increases with a brief lime pulse + `toast.success("+N XP")` when `me.data.points` increases between renders (track previous value in a ref).

### 3. Realtime: also subscribe to `completed_quests` for this attendee

Extend the realtime channel (the one that exists even without a pod — currently gated on `me.data?.group_id`; split it so a per-attendee channel always runs):

- New always-on channel `attendee-{attendeeId}` listening to `completed_quests` filtered by `attendee_id=eq.{attendeeId}` and to `attendees` filtered by `id=eq.{attendeeId}`.
- On any event → invalidate `["completed"]` and `["me"]`. This catches sponsor approvals (which `UPDATE`s completed_quests + attendees.points via the RPC) and the auto-award path.

### 4. Migration: enable realtime on the relevant tables

Add `ALTER PUBLICATION supabase_realtime ADD TABLE public.completed_quests; ALTER PUBLICATION supabase_realtime ADD TABLE public.attendees;` (idempotent — wrap in DO block to ignore if already added). Also `ALTER TABLE ... REPLICA IDENTITY FULL` for both so UPDATEs deliver full rows.

## Files touched

- `src/routes/play.tsx` — add XP widget, claim button + dialog, second realtime channel, points-change toast.
- `supabase/migrations/<new>.sql` — realtime publication + replica identity.

## Out of scope

- Admin-side review for main quests (current design: photo proof = auto-award, same as `claim_quest_anon` already does). If the user wants admin approval on main quests too, that's a follow-up.
- Quest activity score / level math beyond raw `points`.
