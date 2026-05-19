# Auto-load main quest transcripts in Create Visual Recap

## Goal
On the `/recap` page (Step 1 "Bring your transcript"), instead of asking the attendee to upload a `.txt`, show a picker listing all main quests that already have a transcript uploaded by the organizer. Selecting one fetches that transcript and fills the editor so the user can immediately move to Step 2.

## What changes

**File: `src/routes/recap.tsx`** (only file touched)

1. **Fetch available transcripts** with `useQuery`:
   - Query `quests` where `type = 'main'` and `transcript_url is not null`.
   - Return `{ id, title, emoji, transcript_url }[]`.

2. **Replace the `TranscriptCard` upload UI** with a "Choose a quest recap" picker:
   - Renders a list/grid of buttons, one per available main-quest transcript (emoji + title).
   - Selecting one calls `fetch(transcript_url)`, reads `.text()`, and sets `transcript` state.
   - Shows a small loading spinner while fetching; toast on error.
   - Empty state: "No transcripts have been uploaded yet by the organizer."
   - Keep the read-only transcript preview (word count + collapsible textarea) so the user can confirm what was loaded; remove paste/drop/upload affordances and the hidden `<input type="file">`, `onFile` handler, drag-and-drop, and `.txt` validation.

3. **Tidy unused imports** (`Upload`, `FileText`, `X` etc.) that the new picker doesn't need.

Nothing else in the recap flow changes — Step 2 preferences, Step 3 generation, the local fallback, and the AI call all keep working since they only depend on the `transcript` string.

## Out of scope
- The `quest-visual-summary-modal` (the per-quest "Visual summary" button on `/play`) already auto-uses `quests.transcript_url`; no change there.
- Schema / RLS — `quests` is already readable by anon + authed.
- Allowing attendees to upload their own transcript (removed entirely from this screen, per request).

## Technical notes
- Use the browser `supabase` client; `quests` already has `anon read quests` + `authed read quests` policies.
- `transcript_url` points to the public `quest-transcripts` bucket, so a plain `fetch()` works as it does today in `MainQuestRecapModal`.
