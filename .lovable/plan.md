## Part 1 — New profile fields

**Migration** (`attendees`):
- `linkedin_url text` (nullable)
- `github_url text` (nullable)
- `hobbies text[]` default `'{}'`

**Form (`src/routes/join.tsx`)**
- Two URL inputs (LinkedIn, GitHub) — optional, Zod-validated `z.string().url().optional().or(z.literal(""))`, with `.linkedin.com` / `.github.com` soft hint.
- Hobbies: chip input — type → Enter/comma adds a tag, click X to remove. Max ~10 tags, each ≤30 chars, trimmed/deduped. Stored as `text[]`.
- All three are optional; submit writes them alongside existing fields.

**Display**
- `src/routes/play.tsx` profile section: show LinkedIn/GitHub as icon links, hobbies as small chips.
- `src/routes/admin.tsx` attendees table: add a compact "Links" column (LI / GH icons) and hobbies tooltip.
- `src/lib/attendeeDataAdapter.ts`: surface `hobbies` into the derived `interests`/tags array so vibe map + sponsor radar pick them up.

## Part 2 — Two-stage OpenAI matchmaker

Rewrite `src/lib/matchmaker.functions.ts`. Replace the Lovable AI Gateway call with OpenAI's API directly, using the existing `OPENAI_API_KEY` secret and model `gpt-5.2`. Keep the same server-fn entry point `runLlmMatchmaker` and the same wipe/write logic so `admin.tsx` doesn't change.

**Stage 0 — Local clustering (deterministic, no LLM)**
1. Pull eligible attendees (`late=false`, `group_id IS NULL`), including new `hobbies`/`linkedin_url`/`github_url`.
2. Bucket by `(track_intent, event_goal)` composite key — these are now hard enums so grouping is exact.
3. Any bucket with ≥3 attendees is a **strict cluster** (both match).
4. Leftovers from buckets <3 fall into a **relaxed pool**: re-bucket by `event_goal` only, then by `track_intent` only, picking whichever yields the larger ≥3 group for each leftover. Anything still orphaned goes into an "Open" cluster.

**Stage 1 — OpenAI diversity pass (per cluster)**
For each cluster with ≥3 members, call gpt-5.2 with:
- System prompt: "You are a hackathon matchmaker. The attendees below already share track+goal alignment. Split them into pods of 3–5, MAXIMIZING diversity across `university`, `academic_background`, `ai_experience`, `hobbies`. Every attendee must appear in exactly one pod. Respond ONLY as JSON: `{pods:[{member_ids:[...], rationale:"..."}]}`."
- User payload: compact JSON of cluster members (id, uni, bg, ai, hobbies, track, goal).
- `response_format: { type: "json_object" }`.

After response: validate IDs ⊂ cluster, dedupe, append any missing to last pod, then run existing `rebalance()` to enforce 3–5.

**Stage 2 — Write**
Same as today: insert `groups` row per pod (use the LLM `rationale` as `group_name` if short, else "Unnamed pod"; store full rationale in `pod_rationale` which already exists), then update `attendees.group_id`. Return `{ pods_created, method: "openai" | "heuristic", clusters: N, error? }`.

**Fallback**
If OpenAI 401/402/429/timeout for a cluster → run the existing `heuristicPods` on that cluster only. Other clusters still get the LLM treatment. Method reported is `"mixed"` in that case.

**Admin UI tweak (`src/routes/admin.tsx`)**
- Toast message reports cluster count + method (e.g., "4 pods across 3 clusters via OpenAI").

## Technical details

- Endpoint: `https://api.openai.com/v1/chat/completions`, header `Authorization: Bearer ${process.env.OPENAI_API_KEY}`, `model: "gpt-5.2"`, `response_format: { type: "json_object" }`.
- Read `OPENAI_API_KEY` inside `.handler()`, not at module scope.
- No DB changes for matchmaker — `groups.pod_rationale` and `groups.group_name` already exist.
- Types regenerate after migration; no manual `types.ts` edits.

## Out of scope

- No URL preview / scraping of LinkedIn or GitHub.
- No re-import of existing free-text interests into the new hobbies column.
- Existing `wrapped.functions.ts` / `ai.functions.ts` keep using the Lovable AI Gateway; only matchmaker moves to OpenAI direct.
