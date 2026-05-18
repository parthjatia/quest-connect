# Quest Connect v3 — Codes, Groups, LLM matching, Timeline

## 1. Per-attendee 4-digit verification code

- Add `attendees.verify_code text` — 4-char hex (e.g. `A3F9`), generated at signup and shown prominently on `/play` ("Share this with your pod: **A3F9**").
- Replace the current "claim Meet your pod" flow. New table `pod_verifications(verifier_id, verified_id, group_id)` — one row per "I confirmed I met that person."
- On `/play`, the pod card lists every other member with an input box. Typing the correct code creates a `pod_verifications` row → green tick + member name lights up.
- An attendee is "pod-verified" (unlocks side quests for them personally) once they have verified **every other member** of their pod.
- Admin keeps a small panel to view verification progress.

## 2. Group side quests + admin approval (replaces individual side-quest claim)

Main quests stay individual (current photo + transcript flow untouched).
Side quests become group-level:

- New table `group_quest_submissions(group_id, quest_id, photo_url, status, submitted_by, reviewed_at, reviewer_note)` with status enum `pending | approved | rejected`.
- On `/play`, side-quest card shows: current group status for that quest (none / pending / approved / rejected). Any pod-verified member can hit "Submit photo" → uploads → row inserted as `pending`.
- On `/admin`, new "Pending side quests" queue with photo + group name + Approve / Reject. On Approve → mark approved AND award `quests.points_awarded` to every member of the group (via Postgres function `approve_group_submission`).
- `completed_quests` keeps storing per-attendee rows so leaderboard/points logic doesn't change.

## 3. Three group states (derived, no manual toggle)

Computed in a view / on the fly from the data:

- **Inactive** — at least one pod member has not yet been fully verified by everyone else (codes not shared around).
- **Active** — pod fully verified, no `pending` group_quest_submissions.
- **Awaiting review** — pod fully verified AND at least one `pending` submission.

Shown as a colored chip on both `/admin` pod cards and `/play` pod card.

## 4. LLM matchmaker (TanStack server function)

Drop `src/lib/matchmaker.ts` heuristic. Create `src/lib/matchmaker.functions.ts` with a single `createServerFn`:

- Pulls all attendees where `late = false AND group_id IS NULL`.
- Calls Lovable AI Gateway: `POST https://ai.gateway.lovable.dev/v1/chat/completions`, header `Authorization: Bearer ${process.env.LOVABLE_API_KEY}` (key already provisioned), model `google/gemini-3-flash-preview`, `response_format: { type: "json_object" }`.
- System prompt enforces the rule: **same `event_goal` within a pod, maximize diversity on university + academic_background + ai_experience + track_intent**. Pod size 3–5.
- Returns `{ pods: [{ member_ids: string[] }] }` (no auto names / rationale — groups name themselves later).
- Server fn writes `groups` rows with `group_name = "Unnamed pod"` and updates `attendees.group_id`. Falls back to a small heuristic only if the LLM call errors (so the demo never bricks).
- Admin "Form pods" button calls it via `useServerFn`. Toast surfaces 402 / 429 gateway errors.

I'll walk through the request/response shape inline in the response after the plan runs.

## 5. Self-named groups

- Remove auto-generated `Neon Foxes`-style names and `pod_rationale` from the UI. Default `group_name` = "Unnamed pod".
- On `/play` pod card, any verified member can click the name → inline edit → updates `groups.group_name`. Realtime channel pushes the rename to other members.
- Admin pod cards show the user-chosen name; rationale field hidden.

## 6. Main-quest timeline UI

Restyle the main-quest section (both `/play` and a read-only mirror on `/admin`) as a vertical timeline, newest/current at the top:

```text
●  Current quest        [Claim] [Upload transcript]
│
●  Quest 2 — done       [View summary]   <- placeholder image + "AI summary coming soon"
│
●  Quest 3 — done       [View summary]
```

- "Current quest" = first main quest the attendee hasn't claimed yet.
- Side quests stay in their own grid below the timeline.
- Reuses existing `QuestSummaryModal` for the placeholder summary.

---

## Files

**Migration (single):**
- `attendees.verify_code text` (4-char hex, generated server-side at insert)
- table `pod_verifications` + RLS (anon insert/select for demo)
- enum `submission_status` + table `group_quest_submissions` + RLS
- function `approve_group_submission(_submission_id uuid, _note text)` — security definer, awards points to every pod member via `completed_quests` insert
- drop `groups.pod_rationale` usage (column stays, just unused) — set default `group_name = 'Unnamed pod'`

**New / edited code:**
- `src/lib/matchmaker.functions.ts` (new) — LLM server fn
- `src/lib/verify-codes.ts` (new) — hex generator + verify helpers
- `src/routes/admin.tsx` — remove old `buildPods` call, add pending-submission queue, group-state chips, drop random naming
- `src/routes/play.tsx` — verification UI, timeline for main quests, group side-quest submission UI, group rename
- `src/components/pod-verification.tsx` (new)
- `src/components/group-side-quest-card.tsx` (new)
- `src/components/main-quest-timeline.tsx` (new)
- Delete `src/lib/matchmaker.ts` (replaced by server fn)

## Cursor handoff (unchanged)
- Real AI summary in `QuestSummaryModal` using transcript + photo
- Production RLS hardening (currently anon-permissive)
- Better matchmaker prompt tuning / cost controls
