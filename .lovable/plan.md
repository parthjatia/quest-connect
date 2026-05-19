## Goal

The transcript is admin-owned (already stored on `quests.transcript_url`). Every main quest on `/play` should expose the rich Personalized Visual Recap flow (6 preference questions + Comic / Zine / Cards layouts) and auto-fetch the admin-uploaded `.md` — attendees never paste a transcript.

## Current state

- `admin.tsx` already uploads a `.md` per quest to `quests.transcript_url` (storage bucket `quest-transcripts`). Good, keep as-is.
- `play.tsx` main quest timeline already has a "Visual recap" button per quest, but it opens `QuestVisualSummaryModal` — a lighter 4-question / 7-chapter flow, not the rich 6-pref Comic / Zine / Cards experience.
- The rich flow lives at the standalone `/recap` route (`src/routes/recap.tsx` + `src/components/recap/*` + `src/lib/recap-generator.ts` + `src/lib/visual-recap.functions.ts`). It asks the user to paste/upload a transcript.
- Attendee paste UI is the thing to remove from the user journey.

## Changes

### 1. New modal: `MainQuestRecapModal`
- New file `src/components/recap/main-quest-recap-modal.tsx`.
- Reuses the existing `RecapShell` / `RecapResult` / `recap-theme` components and `generateRecap` from `src/lib/recap-generator.ts` (which already calls the server fn in `visual-recap.functions.ts`).
- Props: `{ open, onClose, questTitle, questEmoji, points, transcriptUrl }`.
- On open: fetches the `.md` from `transcriptUrl` once (same pattern as `QuestVisualSummaryModal`) and stores text in local state. No textarea, no upload.
- Two steps only:
  1. **Preferences** — the 6 questions (purpose, flow, tone, world, format, intensity) from the existing `/recap` flow, plus the layout selector (Comic Panels / Magazine-Zine / Collectible Cards). Reuse the question/option arrays from `src/routes/recap.tsx` so wording stays identical.
  2. **Result** — `RecapResult` rendered in the chosen layout, driven by the existing `generateRecap` output.
- Loading + error states identical to current `/recap` page.
- Disabled "Generate" button + clear message when `transcriptUrl` is null ("Waiting for organizer to upload the conversation .md").

### 2. Wire it into `/play`
- In `src/routes/play.tsx`, replace the `QuestVisualSummaryModal` usage for `summaryFor.type === "main"` with the new `MainQuestRecapModal`. Pass `transcriptUrl={summaryFor.transcript_url}`.
- Keep the existing button gating (recap only unlocks after the attendee claims the quest, message when no transcript yet).
- Keep `QuestSummaryModal` for side quests as-is.

### 3. Standalone `/recap` route
- Remove the attendee-facing standalone recap page so the only entry point is per-quest:
  - Delete `src/routes/recap.tsx`.
  - Let the route tree regenerate.
  - Keep `src/components/recap/*`, `src/lib/recap-generator.ts`, `src/lib/recap-store.ts`, and `src/lib/visual-recap.functions.ts` — they're reused by the new modal.

### 4. No DB / backend changes
- No schema changes — `quests.transcript_url` already exists.
- No edits to `visual-recap.functions.ts` (it stays as the server fn powering generation).
- Admin upload UI in `admin.tsx` stays as-is.

## Files touched

- New: `src/components/recap/main-quest-recap-modal.tsx`
- Edited: `src/routes/play.tsx` (swap main-quest modal)
- Deleted: `src/routes/recap.tsx`

## Result

- Admin uploads one `.md` per main quest (already works).
- On `/play`, each main quest card has a "Visual recap" button. Clicking it opens the rich 6-preference + layout-style flow, pre-loaded with that quest's transcript. Attendee never sees a transcript input. Different style choice = visibly different layout (Comic / Zine / Cards), powered by the existing generator.
