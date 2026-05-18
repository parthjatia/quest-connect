# Quest Connect v4 — Fixes + Login + Live Timeline

## 1. Fix: total points ↔ visible quests

Audit where `attendees.points` drifts from `sum(completed_quests.points_awarded)`:
- `claim_quest`, `claim_quest_anon`, `approve_group_submission` all do `points += X`. If a row is inserted twice (or approve runs twice), the increment double-counts.
- Action: drop the `attendees.points` denormalized column from UI math. Compute points live from `completed_quests JOIN quests` in both `/play` and `/admin` (and the leaderboard). Keep the column but treat it as a cache, recomputed by a SQL function `recalc_attendee_points(_id)` called from the three RPCs.
- Add unique constraint `completed_quests(attendee_id, quest_id)` so the same quest can't be double-claimed.

## 2. Group size 3–5 (hard rule)

- Update the LLM matchmaker prompt to require pod size ∈ [3,5].
- Post-LLM validation in `matchmaker.functions.ts`: if any returned pod is <3 or >5, run a deterministic re-balancer (merge smallest pods, split pods >5) before writing `groups`.
- Total attendees < 3 → return error toast "Need at least 3 signed-up attendees".
- Remove the **Seed mock attendees** button from `/admin`.

## 3. Main-quest timeline with live event

**Schema** (migration):
- `quests.start_at timestamptz` (nullable)
- `quests.end_at timestamptz` (nullable)
- `quests.is_live boolean default false` (admin-controlled override; only main quests)
- Constraint: at most one main quest with `is_live = true` at a time (partial unique index).

**Admin (`/admin`)**:
- Main-quest editor gets two datetime inputs (start/end) and a **Go live** button per row. Clicking sets that quest's `is_live=true` and unsets all others (single transaction).
- Timeline preview shows quests ordered by `start_at`, with the live one highlighted.

**Attendee (`/play`)**:
- Timeline reads `is_live` to mark the "Now" row. Past = before `end_at`, Upcoming = after `start_at`, Live = `is_live` (admin truth). Side quests untouched (still always available).

## 4. Login redesign

Replace the current `/auth` flow.

**New `/auth` screen** — two tiles:
- **I'm an attendee** → input for 4-char hex code → POST to new server fn `loginAttendeeByCode({ code })` → if found, store `{ attendee_id, name }` in `localStorage` (existing `local-attendee.ts`) and redirect to `/play`.
- **I'm an admin** → password field; correct value `admin` → set `localStorage.eventquest:is_admin = true` and redirect to `/admin`. `/admin` route guard reads that flag.

Sign-up form (`/join`) keeps the existing excel-derived fields (name, university, academic background, AI experience, track intent, event goal, country, age) and on success shows the freshly generated `verify_code` prominently with "this is your login code — save it".

Drop Supabase email/password auth flows from the UI (keep tables intact so we don't break anything, but no UI surface).

## 5. Transitive pod verification + chain submission

- Keep `pod_verifications` rows (pairwise insert).
- Change "is X verified?" to: compute connected components in the pod's verification graph (undirected — every insert by A→B is treated as A↔B). An attendee is **pod-verified** if their component covers the entire pod.
- Side-quest submission rule: **any attendee whose component has ≥2 members** can submit on behalf of the pod (so two separate chains can both submit; admin still approves one).
- Implemented as a tiny client-side BFS over `pod_verifications` for the user's pod (cheap, ≤5 nodes). Mirror it in a SQL helper `pod_component(_attendee uuid) returns uuid[]` for the submission RPC's check.

---

## Files

**Migration (single):**
- add `quests.start_at`, `quests.end_at`, `quests.is_live` + partial unique index
- add unique `completed_quests(attendee_id, quest_id)`
- add `recalc_attendee_points(uuid)` + call from the three claim/approve RPCs
- add `pod_component(uuid) returns uuid[]` helper
- update `approve_group_submission` to use the unique constraint cleanly

**Edited:**
- `src/routes/auth.tsx` — two-tile login (code / admin password)
- `src/routes/admin.tsx` — remove seed-attendees button, add timeline editor with start/end + Go-live, use derived points
- `src/routes/play.tsx` — live-quest highlight from `is_live`, transitive verification BFS, allow any ≥2-chain member to submit
- `src/lib/matchmaker.functions.ts` — pod-size validator + re-balancer
- `src/components/main-quest-timeline.tsx` — show "LIVE NOW" pill
- `src/lib/local-attendee.ts` — add `is_admin` helpers

**New:**
- `src/lib/auth.functions.ts` — `loginAttendeeByCode` server fn

## Cursor handoff
- Replace `localStorage` admin flag with a real password-hash check before any production use.
- Background job to keep `attendees.points` cache in sync if RPCs ever bypass `recalc_attendee_points`.
