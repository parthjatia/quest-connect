## Plan

### Goal
Make both **Clear all** and **Form pods** reliably work from the admin screen.

### What I found
- The admin page is already calling server functions for both actions, but the current setup still depends on client-side state and a server-function bundle that can fail before the action completes.
- The preview has a runtime module-load error for the browser app, which can prevent the admin page from calling either server function cleanly.
- The server logs did not show successful requests for these actions, so the click likely fails before or at the server-function RPC boundary.

### Changes to implement
1. **Harden the admin server functions**
   - Keep `clearAllDataFn` server-side with the admin database client.
   - Add explicit logging and return counts for each table cleared so failures are visible.
   - Clear dependent tables first, then attendees/groups/quests.

2. **Make Form pods fully server-driven**
   - Keep the matching logic server-side.
   - Let the server function check eligible attendee count itself instead of relying only on the client’s currently loaded query data.
   - Return a clear status like `not_enough_attendees`, `created`, or `failed`, so the button can show the exact reason.

3. **Fix the admin button handlers**
   - `Clear all` will call the server clear function and refresh admin queries only after success.
   - `Form pods` will call the server matchmaker even if the local attendee query is stale, then refresh attendees and groups.
   - Toasts will show actionable errors instead of a generic “doesn’t work”.

4. **Resolve the runtime import failure if it is caused by stale dev-server state**
   - Check the dev-server logs after edits.
   - Restart the dev server only if needed so the latest server-function/client split is picked up.

5. **Verify**
   - Confirm the admin route loads.
   - Confirm server-function logs show calls for both actions.
   - Confirm `Clear all` leaves 0 attendees, 0 quests, 0 pods.
   - Confirm adding mock attendees then pressing `Form pods` creates groups and assigns attendees.