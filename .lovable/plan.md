## 1. Quests tab reorder (`src/routes/play.tsx`)

In the `tab === "quests"` block (around lines 420–461), reorder so the Main Quest timeline sits at the top and the Pod leaderboard at the bottom:

1. `PodPanel` (or the "no pod" notice) — unchanged, stays first as the pod context.
2. `MainQuestTimeline` — moved up to right after the pod panel.
3. `SideQuestsSection` — unchanged middle.
4. `PodLeaderboard` — moved to the very bottom.

## 2. Pod leaderboard: top 5 only (`src/routes/play.tsx`)

In `PodLeaderboard` (≈ line 602), change `rows.slice(0, 10)` → `rows.slice(0, 5)`. Keep the "your pod · #N" indicator using the full ranking so a user outside the top 5 still sees their real rank in the header line.

## 3. Recap page: trim text (`src/routes/recap.tsx`)

Goal: drop the "Step 1 / Step 2 / Step 3" kickers and the small descriptive subtitles. Keep only the main titles and the main questions.

- `SectionHeader` calls — remove `kicker` and `description` props from the three usages (Step 1 transcript, Step 2 tune, Step 3 result). Simplest: render only the `<h2>` title; drop the kicker line and the description `<p>`.
- `PreferenceQuestion` (≈ lines 441–487) — remove the "Question N of 6" kicker line and the `question.subtitle` `<p>`. Keep the icon tile, `question.title` (the main question), and the option buttons. Also remove the per-option `hint` line under each option button so only the option label remains.
- Leave the `Hero` headline/subtitle alone (it's the page hero, not the per-section text the user is complaining about).

## Out of scope
- No changes to landing `/`, no data/RLS/backend changes, no quest/leaderboard logic changes beyond the slice count.
- Animation/styling tokens untouched.

## Technical notes
- `SectionHeader` is only used in `recap.tsx` — safe to simplify or replace inline.
- `MainQuestTimeline` already receives all required props in the current Quests tab — moving the JSX block up requires no prop changes.
- Leaderboard `myRank` is computed before the slice, so the "#N" badge stays accurate for users outside the top 5.
