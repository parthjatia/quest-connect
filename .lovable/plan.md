I’ll make **Clear all** restore the event to a clean starting state where all live counters are zero.

Plan:
1. Replace the current Clear all backend with one direct reset operation that clears:
   - all attendees
   - all pods/groups
   - pod verifications
   - attendee meet records
   - completed quests
   - group quest submissions
   - quest transcripts
2. Make the admin button report the final state, not just attempted delete counts:
   - attendees = 0
   - pods = 0
   - related activity tables = 0
3. Add a verification read after the reset so the backend fails loudly if anything remains instead of showing success.
4. Keep quests and event settings untouched, so only attendees/pods/activity are reset.
5. Fix matchmaker separately right after this reset is reliable: it should create pods from the current attendee list and fall back if the LLM fails.

Technical details:
- The reset should happen in a single database function/RPC or tightly ordered server action so foreign-key/order issues cannot leave partial data.
- The admin UI should invalidate attendee, pod, and pending-submission queries after success so the page immediately shows zero.
- I’ll verify with database row counts after implementing.