# Plan: Quest Connect — Signup → Pods → Gated Quests → Transcripts → Summary

## 1. Attendee signup form (`/join`)

Replace the current "pick name from roster" UI with a real signup form collecting:
- Full name
- University
- Academic background
- AI experience (none / beginner / intermediate / advanced)
- Track intent
- Event goal

On submit → insert into `attendees`, store id in `localStorage`, navigate to `/play`.
If registration is closed (see step 2), still allow signup but set `group_id = null` and a `late = true` flag so they're excluded from pods.

Admin keeps the "seed roster" button for demo data.

## 2. Registration lock + pod generation (`/admin`)

Add a single app-level setting `registration_open` (boolean).

- New table `event_settings` (single row): `registration_open boolean`, `pods_locked boolean`.
- Admin gets a toggle: **"Close registration"**. Once closed, `/join` form shows a banner "Registration closed — you can still join but won't be assigned a pod."
- After closing, admin clicks **"Generate pods"** → runs existing `buildPods()` over attendees where `group_id IS NULL AND late IS NOT TRUE`, creates groups of 3–5, writes `group_id` + `pod_rationale`.
- Admin can re-open / regenerate during demo.

## 3. Pod-gate main quest

- Add a column `quests.is_pod_gate boolean` (default false). Seed one quest: "Meet your pod — take a selfie with your group" marked `is_pod_gate = true`, `type = 'main'`.
- On `/play`, gate logic:
  - If attendee has no pod → show "Waiting for organizer to create pods."
  - Show main quests always.
  - Show side quests **only if** this attendee has personally claimed the pod-gate quest (row exists in `completed_quests` for them).
- Side quest list shows a locked overlay with "Complete 'Meet your pod' to unlock" until claimed.

## 4. Transcript upload per main quest

- New table `quest_transcripts`:
  - `attendee_id`, `quest_id`, `transcript_url` (markdown file in storage), `uploaded_at`.
- New storage bucket `quest-transcripts` (private; anon insert allowed for demo).
- On `/play`, each **main** quest card gets an "Upload transcript (.md)" button → uploads to bucket → inserts row.
- Admin view lists transcripts per quest with download links.

## 5. View Summary button

- For each row in `completed_quests` on `/play`, add a **"View summary"** button.
- Opens a modal showing:
  - Placeholder hero image (use existing lime/black aesthetic, generated SVG or `/placeholder.svg`)
  - Quest title, claimed timestamp, points earned
  - Stub paragraph: "AI summary coming soon."
- Cursor handoff: wire to real LLM summary later using `transcript_url` + `quest_photo_url`.

---

## Files

**Migration** (single):
- `event_settings` table + seed row
- `attendees.late boolean default false`
- `quests.is_pod_gate boolean default false` + seed pod-gate quest
- `quest_transcripts` table + RLS (anon insert/select for demo)
- Storage bucket `quest-transcripts` + policies

**New / edited code**:
- `src/routes/join.tsx` — replace with full signup form, read `registration_open`
- `src/routes/admin.tsx` — add registration toggle, "Generate pods" button, transcripts panel
- `src/routes/play.tsx` — gate side quests, add transcript upload, add "View summary" modal
- `src/components/quest-summary-modal.tsx` (new)
- `src/lib/local-attendee.ts` — extend stored shape
- `src/lib/event-settings.ts` (new) — read/write helpers

## Cursor handoff (unchanged areas)
- Real LLM summary from transcript + photo → wire in `quest-summary-modal.tsx`
- Real matchmaker LLM → `src/lib/matchmaker.ts`
- Production RLS (currently anon-permissive for demo)
