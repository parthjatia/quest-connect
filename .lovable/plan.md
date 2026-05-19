
## 1. Remove Quest Transcripts from admin + label sponsor quests

`src/routes/admin.tsx`:
- Remove the "Quest Transcripts" section/block entirely (and any related transcript upload UI tied to it).
- In the quest list rows, when `created_by_sponsor` is set, render a small `SPONSOR QUEST · {handle}` badge next to the MAIN/SIDE badge (replaces or supplements the SIDE label visually).

## 2. +4 pts per new pod member unlocked

New mechanism so verifications award points (today `recalc_attendee_points` only sums completed quests).

DB migration:
- Add `pod_bonus_points int NOT NULL DEFAULT 0` to `attendees`.
- Replace `recalc_attendee_points` so it returns `completed_quest_points + pod_bonus_points + meet_bonus_points` (see §3).
- New trigger `on_pod_verification_award` AFTER INSERT on `pod_verifications`: for each new row, +4 to `verifier_id`'s `pod_bonus_points` and +4 to `verified_id`'s `pod_bonus_points` (both sides unlock each other), then call recalc on both.

No client code change required — the existing `verify_pod_member` RPC flow already inserts into `pod_verifications`.

## 3. Meet attendees outside your pod (+2 pts each) + Network dashboard

DB migration (same migration as §2):
- Add `meet_bonus_points int NOT NULL DEFAULT 0` to `attendees`.
- New table `attendee_meets`:
  - `id uuid pk`, `attendee_id uuid`, `met_attendee_id uuid`, `created_at timestamptz default now()`
  - unique `(attendee_id, met_attendee_id)`, check `attendee_id <> met_attendee_id`
  - RLS: anon + authed insert/select (matches existing pattern)
- New RPC `meet_attendee(_attendee_id uuid, _code text)`:
  - Look up target attendee by `verify_code` (any attendee, not pod-scoped).
  - Reject if same id or already in same group (those go through pod verify).
  - Insert two rows (`a→b` and `b→a`), ON CONFLICT DO NOTHING. For each newly inserted row +2 `meet_bonus_points` to that attendee, then recalc.
  - Also push ids into existing `met_attendee_ids` array on `attendees` for both sides.
- Trigger is not needed — the RPC handles awarding atomically.

Frontend (`src/routes/play.tsx`):
- New "Your network" card with:
  - Big circular SVG ring graphic showing total unique people met (pod verifications count + attendee_meets count); center number = total met, subtitle "people connected".
  - Small breakdown: `X pod members · Y new connections`.
  - Input + button "Exchange code" — calls `meet_attendee` RPC. Toast "+2 pts! Met {name}" on success, or "already connected" / "use pod verify instead" as appropriate.
- Queries:
  - `useQuery(["meets", me.id])` selecting from `attendee_meets` where `attendee_id = me.id`, joined to attendees for names.
  - Reuse existing pod verification count.

## 4. Sponsor Radar link in sponsor portal

`src/routes/sponsor.tsx`:
- Add a secondary nav button/link in the header (next to sign out) → `<Link to="/sponsor-radar">Sponsor radar</Link>`.
- Also add a "Open Sponsor Radar" card/CTA in the main content area for visibility.

## Out of scope
- No retroactive backfill of points for existing pod_verifications (trigger fires on new inserts only). If the user wants a one-time backfill we can add it after.
- No leaderboard changes — totals automatically include new bonuses via `recalc_attendee_points`.
- Quest Transcripts table itself stays in DB (only the admin UI section is removed).
