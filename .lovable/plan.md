Plan to fix all admin delete controls:

1. Make every delete control an unmistakable real button
   - Clear all stays a full button next to Seed 100 mock.
   - Main quest and side quest trash icons become proper icon buttons with a larger click target, `type="button"`, `aria-label`, and `title`.
   - Add visible hover/focus states so they no longer feel like decorative symbols.

2. Wire all delete buttons to the existing server functions
   - Clear all will call `clearAllDataFn` from the admin page.
   - Main quest and side quest delete buttons will call `deleteQuestFn` with that quest id.
   - While a delete is running, disable the clicked control and show a spinner so repeat clicks do not interfere.

3. Make the backend delete path reliable
   - Keep deletes in `src/lib/admin.functions.ts` using the privileged backend client so they are not blocked by row-level rules.
   - For quest deletion, delete dependent quest rows first, then delete the quest, then verify the quest no longer exists.
   - For clear all, run the reset function and verify attendees, pods, and activity tables are zero.

4. Refresh the admin UI after deletes
   - Invalidate quests, attendees, pods, pending submissions, and related admin queries after successful deletion.
   - This ensures the rows disappear immediately instead of requiring a manual refresh.

5. Verify in preview
   - Open `/admin`, seed mock attendees, use Clear all, confirm counters return to zero.
   - Create/delete both a main quest and a side quest, confirm the clicked rows disappear and no errors appear in console/network.