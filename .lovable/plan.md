Goal: make "Run matchmaker" finish in ~10s for the demo, while still grouping people by shared AI track and event goal into pods of 3–5.

Changes (all in `src/lib/matchmaker.functions.ts` / `matchmaker.server.ts`):

1. Swap the model from `google/gemini-2.5-pro` to `google/gemini-2.5-flash-lite` (cheapest/fastest Gemini, well under 10s for this prompt size). Keep the same gateway and API key.

2. Add a hard timeout (~8s) around the AI call using `AbortController`. If it times out or errors, fall back to the existing heuristic split — no retries, no waiting.

3. Simplify the clustering step for the demo:
   - Group attendees strictly by `track_intent + event_goal`.
   - Any cluster with ≥3 people gets split into pods of 3–5 directly via the existing `heuristicSplit` (no AI diversity pass needed — the user only wants same track + same goal).
   - Leftovers (<3 in a track+goal bucket) get merged into one "Open" pod bucket and split the same way.
   - Skip the per-cluster AI diversification entirely, or gate it behind a flag that is off for now. This is what currently makes it slow (one AI call per cluster).

4. Keep the DB writes (clear groups → insert groups → assign attendees) unchanged.

5. Update the returned `method` to `"heuristic"` since we're no longer relying on AI for splits, and log total elapsed time so we can confirm <10s.

No UI changes. No schema changes. After the edit I'll trigger the matchmaker once via the admin page and confirm in worker logs that it completes in <10s and produces pods of 3–5 sharing track + goal.