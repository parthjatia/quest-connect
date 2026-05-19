## Plan

1. **Change the Clear all server action to match the requested scope**
   - Delete all rows from `attendees` so the admin attendee count becomes `0`.
   - Delete all created `groups` so no pods remain.
   - Clear related attendee/pod activity tables first so dependent records do not block the reset:
     - `pod_verifications`
     - `attendee_meets`
     - `completed_quests`
     - `group_quest_submissions`
     - `quest_transcripts`
   - Leave `quests` untouched.
   - Leave `event_settings` untouched.

2. **Make the action more reliable and easier to debug**
   - Use the backend admin client inside the existing server function.
   - Log each step and return counts for deleted attendees, deleted pods, and cleared related records.
   - Use broad delete filters that work reliably with the current table shapes.

3. **Update the admin button behavior**
   - Change the confirmation copy so it no longer says quests will be deleted.
   - After success, refresh only attendee, pod, and pending-submission queries.
   - Show a success toast with the actual counts cleared.

4. **Verify the fix**
   - Inspect server-function logs if the action still errors.
   - Confirm the admin UI no longer attempts to clear quests.
   - Confirm the handler returns success and the attendee/pod counts refresh to zero.