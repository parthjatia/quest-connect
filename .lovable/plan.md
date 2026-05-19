## Goal

Make `track_intent` and `event_goal` discrete enum fields (like `ai_experience`) instead of free-form text. Replace text inputs with button-pick UIs everywhere users select them.

## Discrete values

**Track (`track_intent`)** → new enum `track_intent`:
- `ai_for_business` — "AI for Business"
- `creative_marketing` — "Creative / Marketing Tech"
- `dev_tools_infra` — "Dev Tools / Infrastructure"
- `fintech_payments` — "Fintech / Payments"
- `health_sustainability` — "Health & Sustainability"
- `open_track` — "Open track (no theme)"

**Event goal (`event_goal`)** → new enum `event_goal`:
- `working_product` — "A working product"
- `job_internship` — "Job / internship"
- `experience` — "Just the experience"
- `new_connections` — "New connections"

## Database migration

1. `CREATE TYPE public.track_intent AS ENUM (...)` and `CREATE TYPE public.event_goal AS ENUM (...)`.
2. Add temp columns `track_intent_new track_intent`, `event_goal_new event_goal` on `attendees`.
3. Best-effort map existing free-text rows (case-insensitive `LIKE` on keywords: "fintech"→`fintech_payments`, "dev"/"tool"/"infra"→`dev_tools_infra`, "creative"/"market"→`creative_marketing`, "health"/"sustain"→`health_sustainability`, "business"→`ai_for_business`, else `open_track`; goal: "product"→`working_product`, "job"/"intern"→`job_internship`, "connect"/"network"→`new_connections`, else `experience`). Unmapped rows stay NULL.
4. `ALTER TABLE ... DROP COLUMN track_intent, RENAME track_intent_new TO track_intent` (same for `event_goal`).
5. `attendees.track_intent` and `attendees.event_goal` remain nullable.

(After migration runs, `src/integrations/supabase/types.ts` regenerates automatically.)

## Frontend changes

**Shared constants** — new `src/lib/attendee-options.ts` exporting:
```ts
export const TRACK_OPTIONS = [{ value: "ai_for_business", label: "AI for Business" }, ...] as const;
export const GOAL_OPTIONS = [{ value: "working_product", label: "A working product" }, ...] as const;
export type TrackIntent = typeof TRACK_OPTIONS[number]["value"];
export type EventGoal = typeof GOAL_OPTIONS[number]["value"];
export const trackLabel = (v: string | null) => TRACK_OPTIONS.find(o => o.value === v)?.label ?? v ?? "—";
export const goalLabel = (v: string | null) => GOAL_OPTIONS.find(o => o.value === v)?.label ?? v ?? "—";
```

**`src/routes/join.tsx`** — replace the two `<Input>` and `<Textarea>` fields for Track and Goal with the same button-grid pattern used for AI experience (2-col grid on track, 2-col on goal). State holds enum values. Submit sends enum string.

**`src/routes/admin.tsx`** — render `trackLabel(a.track_intent)` in the attendees table column; if there's any admin edit UI for these fields, swap to a `<Select>`.

**`src/routes/play.tsx`** — `profileBits` already just displays the value; pipe through `trackLabel(...)`.

**`src/lib/matchmaker.functions.ts`** — no logic change required (it already groups by raw `event_goal` value and passes to the LLM); the enum values are stable strings so grouping still works. Update the LLM system prompt to note that goal/track are now fixed enum codes (so it doesn't try to invent values).

**`src/lib/ai.functions.ts` / `wrapped.functions.ts`** — when building prompt strings, pass through `trackLabel` / `goalLabel` so the AI sees human-readable text, not the enum code.

**`src/lib/attendeeDataAdapter.ts`** — map enum codes to labels when surfacing `track`/`goals` derived fields.

## Out of scope

- No backfill UI; the migration's best-effort map is one-shot. Rows with NULL after mapping will appear as "—" until the attendee re-submits (or admin edits).
- No change to the upload/CSV-import flow (if any) — flagged as a follow-up if it exists and currently writes free text.
- The `attendees.track` column (separate from `track_intent`) is left alone; this plan only touches `track_intent` and `event_goal`.
