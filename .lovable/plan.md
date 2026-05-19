## Changes

Two small, scoped edits.

### 1. Remove the "Claim" button from main quests
File: `src/routes/play.tsx`

- In `MainQuestTimeline`, drop the `<Button>…Claim</Button>` block (lines ~484-488) and the now-unused "Visual recap unlocks after you claim" hint (~492-494).
- Drop the `onClaim` prop from `MainQuestTimeline` and the `onClaim={(q) => setActiveMainClaim(q)}` callsite (~245).
- Remove `activeMainClaim` state + the `<ClaimDialog>` render block (~262-269) since it is no longer reachable.
- Remove the now-unused `ClaimDialog` component definition (~602-end) and the `Camera` import if it becomes unused.

Side-quest submission flow stays intact (it's a separate `GroupSubmitDialog`). Main quests now visibly complete only when a `completed_quests` row exists for them (e.g. created by another path / organizer); we are not adding a replacement completion path in this change — the user explicitly asked to remove the button.

### 2. Fix the "Total points" stat in admin
File: `src/routes/admin.tsx`

Currently:
```ts
const totalPoints = (attendees.data ?? []).reduce((s, a) => s + a.points, 0);
```
This sums points actually earned by attendees, which happens to read 45 right now.

Change it to sum `points_awarded` across all quests (main + side) from `quests.data`:
```ts
const totalPoints = (quests.data ?? []).reduce((s, q) => s + (q.points_awarded ?? 0), 0);
```
The `<Stat label="Total points" value={totalPoints} />` line is unchanged.

## Out of scope
- No DB changes, no new completion flow for main quests, no UI restyle.
