## Scope

Three changes to the matchmaker + quest flows. No new dependencies.

---

### 1. Untitled pod names

**File:** `src/lib/matchmaker.functions.ts`

After the heuristic split builds the `pending` list, replace the per-pod name (currently `pod.cluster.label`) with a sequential `"Untitled 1"`, `"Untitled 2"`, ... as each group row is inserted. Keep `pod_rationale` as-is so the organizer can still see why people are together.

---

### 2. Retire `/dashboard` and `/wrapped`; comic flow already lives per main quest

You confirmed the comic flow is the per–main-quest pop-up with the 6-question quiz, which is **already implemented** as `MainQuestRecapModal` and wired into `/play` (each approved main quest gets a "Visual recap" button that loads the organizer's uploaded transcript `.md` and runs the same quiz → images pipeline you described).

To stop confusion from the old separate pages:

- **Delete `src/routes/dashboard.tsx`** (legacy quest board + claim dialog — superseded by `/play`).
- **Delete `src/routes/wrapped.tsx`** and **`src/lib/wrapped.functions.ts`** (the "upload-text → one comic" flow you don't want anymore).
- Remove the `<Link to="/wrapped">` button inside `dashboard.tsx` (gone with the file) and any remaining nav references to either route in `src/components/app-header.tsx`.
- Any redirect that currently lands on `/dashboard` after sign-in (`src/routes/auth.tsx`) is repointed to `/play`.

Net effect: a player signing in goes straight to `/play`, opens a main quest's "Visual recap" pop-up, answers the 6 questions, and gets the comic generated from that main quest's transcript `.md` — exactly the flow you described. No other AI/recap logic changes.

---

### 3. Sponsor-verified side quests (link submission)

Sponsor-created side quests (`quests.created_by_sponsor IS NOT NULL`) get a different claim + verification path. Organizer-created side quests are unchanged.

**Schema (migration):**

- Add column `proof_link text` to `completed_quests`.
- Add column `verification_status text not null default 'auto'` to `completed_quests` with values `auto | pending | approved | rejected` (auto = today's behavior for non-sponsor quests).
- Add `verified_at timestamptz`, `verified_by_sponsor text`, `reviewer_note text` to `completed_quests`.
- New RPC `claim_sponsor_quest(_quest_id uuid, _proof_link text)`:
  - Look up `attendees.id` from `auth.uid()`.
  - Validate the quest exists and is sponsor-created; require non-empty URL.
  - Insert a `completed_quests` row with `verification_status='pending'`, `proof_link=_proof_link`, and **no points awarded yet** (do NOT call `recalc_attendee_points`).
- New RPC `sponsor_review_completion(_completed_id uuid, _approve boolean, _note text)`:
  - SECURITY DEFINER; verifies the caller's sponsor handle matches `quests.created_by_sponsor` for that completion (sponsor handle comes from the request, passed in by the client — sponsors aren't auth users).
  - On approve: set status `approved`, fill `verified_at`/`verified_by_sponsor`, then `recalc_attendee_points(attendee_id)`.
  - On reject: set status `rejected`, store `reviewer_note`. No points.

Because sponsors authenticate via `getLocalSponsor()` (no Supabase auth user), the review RPC accepts the sponsor handle as an argument and the call goes through a `createServerFn` (`reviewSponsorCompletionFn`) using `supabaseAdmin` so RLS doesn't block it. The server function asserts handle ↔ quest ownership before forwarding to the RPC.

**Client — `/play` (`src/routes/play.tsx`):**

- In the side-quest claim modal (and the `QuestCard` "Claim" button), branch on `quest.created_by_sponsor`:
  - If sponsor quest → render a "Proof link (URL)" input instead of the photo uploader. On submit, call `supabase.rpc('claim_sponsor_quest', { _quest_id, _proof_link })`. Show toast "Submitted to sponsor for review — points pending."
  - Side quests already claimed but `verification_status='pending'` show a "Pending sponsor review" badge instead of "Claimed".
  - On `rejected`, show "Rejected — try again" and re-enable the claim button.

**Client — `/sponsor` (`src/routes/sponsor.tsx`):**

- Add a new "Pending verifications" section below "Your submissions".
- Query: `completed_quests` joined with `quests` where `quests.created_by_sponsor = handle` and `verification_status = 'pending'`, plus the attendee's `full_name`. Realtime channel on `completed_quests` to refresh.
- Each row shows attendee name, quest title, the proof link (as an external `<a target="_blank" rel="noopener">`), and Approve / Reject buttons. Reject opens a small note input.
- Approve/Reject call the new `reviewSponsorCompletionFn` server function with the sponsor handle from `getLocalSponsor()`.

No change to admin approval of the side-quest *definition* (sponsor still proposes the quest, organizer still approves it goes live). Only the per-claim verification moves to the sponsor.

---

## Out of scope

- Visual-recap pipeline internals (unchanged).
- Organizer-created side quest claim flow (unchanged — still photo + auto-award).
- Pod creation logic beyond renaming.
