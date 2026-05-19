## Plan

1. **Replace the current reset RPC with a direct SQL reset**
   - Update `admin_clear_attendees_and_pods()` so it runs one simple, ordered database cleanup:
     - clear pod verification rows
     - clear attendee meet rows
     - clear completed quest/submission/transcript rows tied to attendees/pods
     - clear every attendee row for this event
     - clear every group/pod row
   - Return the actual counts removed so the admin toast can confirm what happened.

2. **Make the admin server action call only that SQL function**
   - Keep `clearAllDataFn` as a thin backend call to the reset function.
   - Add explicit error logging and return counts for attendees and groups/pods.

3. **Keep the UI behavior simple**
   - The Clear all button continues to call the backend reset.
   - After success, refresh attendee, group/pod, and pending submission queries.
   - Quests and event settings remain untouched.

4. **Verify against the real database**
   - Before/after check row counts for `attendees`, `groups`, and related pod/quest activity tables.
   - Confirm the counts become zero for attendees and groups/pods.