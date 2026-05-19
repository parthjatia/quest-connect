## Event Wrapped — Spotify-style slideshow

### Entry point
- In `src/routes/play.tsx`, directly under the Side Quests section, add a full-width gradient button: **"View your Event Wrapped →"**. Disabled with hint "Submit at least one quest first" if the attendee has zero approved quests and zero connections; otherwise enabled.
- Clicking navigates to a new route `/wrapped`.

### New route: `src/routes/wrapped.tsx`
A full-screen, one-slide-at-a-time deck. Each slide fills the viewport with a bold gradient background and large display typography, mirroring the reference image (Spotify Wrapped 2024 cards: dark base, vibrant gradient swooshes, big bold headline, small kicker label, supporting line beneath).

Behavior:
- Click anywhere on the current slide → advance to next.
- On the final slide, clicking returns to `/play` (dashboard).
- Top-right close button (×) on every slide returns to `/play` immediately.
- Top progress bar (segmented, one segment per slide, like Spotify/Instagram stories) fills as you advance. No auto-advance — purely tap-driven, as requested.
- Keyboard: ArrowRight/Space = next, Escape = back to dashboard.
- Subtle entrance animation per slide (fade + scale + gradient sweep) using CSS transitions only — no new deps.

### Slide sequence (real-time data, no mocks)
All data comes from the existing tables for the signed-in attendee. Fetched in one server function `getEventWrapped` (`src/lib/wrapped.functions.ts`) using `requireSupabaseAuth`, returning a single DTO consumed by `useSuspenseQuery`.

1. **Intro** — "You showed up." + attendee name + "Let's look at your event."
2. **Total XP** — giant number = `attendees.points`, kicker "Your XP", subline "Out of N attendees you ranked #K" (computed from a `points desc` ordering).
3. **XP breakdown** — three stacked rows: Quests XP (`points − pod_bonus − meet_bonus`), Pod bonus, Meet bonus. Each with its number.
4. **Connections made** — count of distinct attendees in `verifications` where `verifier_id = me OR verified_id = me`, kicker "People you met", subline lists up to 3 names ("…and X more" if more).
5. **Top quest** — the approved `completed_quests` row with the highest `quests.points_awarded`; shows quest emoji + title + "+N XP". If none approved yet, skip this slide.
6. **Main insight** — AI-generated one-paragraph insight (≤ 40 words) about the attendee's event, generated server-side via Lovable AI Gateway (`google/gemini-2.5-flash`) using their name, track, goal, XP totals, connection count, and approved quest titles. Cached on `attendees.wrapped_insight` so repeat visits are instant.
7. **Outro** — "That's your event, {name}." + "Tap to return to your dashboard." Tap → `navigate({ to: "/play" })`.

### Data layer
- New server function `getEventWrapped` returns:
  ```
  { name, points, questXp, podBonus, meetBonus, rank, totalAttendees,
    connectionCount, topConnections: string[],
    topQuest: { title, emoji, points } | null,
    insight: string }
  ```
- Insight generation: if `attendees.wrapped_insight` is null, call AI Gateway, persist, return. Otherwise return cached. (Adds one nullable text column via migration.)
- Realtime freshness: the `/wrapped` route uses `useSuspenseQuery` with `staleTime: 0` and refetches on focus, so newly-approved XP and connections appear immediately. No SSR loader (route opens client-side from a button click).

### Migration
- `ALTER TABLE public.attendees ADD COLUMN wrapped_insight text;` — single nullable column. No RLS changes needed (existing attendee policies cover it).

### Visual design (matches reference)
- Dark `#0a0a0a` base, full-bleed slide.
- Each slide uses one of 6 distinct gradient "swooshes" (conic + radial CSS gradients in semantic tokens added to `src/styles.css`): magenta→indigo, lime→teal, coral→amber, violet→cyan, rose→orange, sky→emerald. Pre-defined, no per-slide randomness.
- Typography: existing display font, very large (clamp 3rem → 7rem), tight tracking, bold weight; small uppercase kicker label above the number/headline.
- Brand chip "Event Wrapped" top-left, close × top-right, story-style segmented progress bar across top.
- Mobile-first; works at the user's 986px viewport and on phones.

### Out of scope
- No share-image export, no social posting, no admin view.
- No changes to XP rules, quest approval flow, or side-quest logic.
- No changes to existing recap (`/recap`) route — Wrapped is a separate, simpler experience.

### Files touched
- `supabase/migrations/<ts>_wrapped_insight.sql` (new)
- `src/lib/wrapped.functions.ts` (new)
- `src/routes/wrapped.tsx` (new)
- `src/routes/play.tsx` (add the entry button under side quests)
- `src/styles.css` (6 gradient tokens)

### QA checklist before declaring done
- Button appears under Side Quests, navigates to `/wrapped`.
- All slides render with correct live numbers (verified against `supabase--read_query`).
- Tap advances; final tap returns to `/play`; × always returns to `/play`.
- No console errors; build passes; works on 986px viewport.
