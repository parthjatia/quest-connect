## Goal

The 100 rows in `attendees` all have `current_zone = NULL` and empty `interests/goals/skills/personality_tags/looking_for`. The Vibe Map reads these directly, so every zone scores 0 and the heatmap behaves erratically. Fix the data, confirm the end-to-end flow, and clean up the heatmap visuals which are currently a noisy mix of red/orange/yellow bubbles + glows + cluster dots across all 8 zones.

## 1. Seed dummy values for existing attendees

Run a single data update (via the insert tool) that fills the empty profile fields for every current attendee using deterministic SQL — no migration, no schema change:

- `current_zone`: pick one of the 8 `EVENT_ZONES` deterministically from `id` so zones are well-distributed (roughly 12–13 per zone).
- `interests`, `goals`, `skills`, `personality_tags`, `looking_for`: assign one of ~8 curated "persona packs" (mirroring `ENRICH_PACKS` in `attendeeDataAdapter.ts`) chosen by `hash(id) % 8`, so the data lines up with what the Vibe Map filters already key off (AI, startups, design, fintech, sports tech, gaming, robotics, consulting).
- `track`: derive from the persona pack ("AI", "Startup", "Design", "Fintech", "Sports Tech", "Gaming", "Robotics").
- Only update rows where the field is `NULL` / empty array — never clobber attendees that already filled their profile.
- Keep `discovery_visibility = true` (already the default) and `sponsor_open` untouched.

This makes the Vibe Map fully functional against live data without changing how the data adapter or engine work.

## 2. End-to-end Vibe Map verification

After the data is in, verify:
- Heatmap renders non-zero matching counts across multiple zones.
- "Find filters from my profile" applies and produces a non-empty `bestZone`.
- "I'm here now" zone selector saves to the DB (`updateAttendeeZone`) and the bubble follows the user.
- Selecting another zone shows top matches with names + shared tags.

If any step misbehaves, fix it in `vibeMap.functions.ts` / `vibeMapEngine.ts` / `vibe-map-section.tsx` — but I expect the seeding alone is enough since the engine itself is unchanged.

## 3. Heatmap UI polish (`src/components/vibe-map/floorplan.tsx`)

Current issues: 4-step heat scale (very-hot/hot/warm/cold) uses red→orange→yellow→blue, plus a soft glow ellipse behind every zone, plus 1–3 small heat-bubble circles at the bottom of each zone. With 8 zones this reads as scattered, multi-colored noise.

Cleanup:
- Collapse to a single brand hue (lime) and vary only **lightness + opacity** by intensity, instead of switching hue per heat level. The "best zone" already uses lime — extending it consistently makes the map feel intentional.
- Drop the bottom `<HeatBubbles>` cluster entirely (the rounded zone tile + glow already conveys intensity; the dots add visual noise).
- Soften the per-zone glow ellipse: smaller radius, lower opacity, only render for zones with `matchingCount > 0`.
- "Cold" zones become a flat muted card surface (no colored fill, no glow) so the eye is drawn only to zones with real matches.
- Keep selected/best ring + "you" dot exactly as-is (already clean).
- Update the legend chips to reflect the new scale: `quiet → some → strong → top match` (single hue ramp).

No layout/zone-coordinate changes.

## Files touched

- Data: one `supabase--insert` call (UPDATE on `public.attendees`) — no migration.
- `src/components/vibe-map/floorplan.tsx` — color scale + remove bubble cluster + soften glow.
- Possibly `src/components/vibe-map/vibe-map-section.tsx` if the legend label text lives there (it doesn't — it's in floorplan).

## Out of scope

- Schema changes, RLS changes, new tables.
- Sponsor Radar, quests, pods.
- The vibe map matching algorithm itself.
