# Surface the Visual Recap CTA + verify the flow

The `/recap` page already exists with everything you described:
transcript paste + `.txt` upload, all 6 preference questions, `templateId =
infoMode + "_" + visualMode`, 7-section recap, image slots (`coverHero`,
`bigPictureScene`, `keyMoment_1..3`, `finalMemory`) generated server-side
via Lovable AI, comic / zine / cards layout switch, cinematic loading
state, premium dark UI. It's just missing a visible entry point.

## What to change

### 1. Add a prominent "Create Visual Recap" CTA on the attendee Home tab

In `src/routes/play.tsx`, in the Home tab (`tab === "home"`), add a new
CTA card directly above the existing Event Wrapped CTA. Sibling design
language — `bg-swoosh-2 hue-drift`, `<FloatingDecor variant="dense" />`,
animated headline, navigates to `/recap`.

```text
┌─────────────────────────────────────────┐
│ NEW                                     │
│ Create Visual Recap              →      │
│ Turn a transcript into a comic, zine,   │
│ or card-style summary.                  │
└─────────────────────────────────────────┘
```

Uses the existing `FloatingDecor` and `AnimatedHeadline` so it matches
the retro arcade vibe just shipped. `onClick={() => navigate({ to: "/recap" })}`.

### 2. Keep the small "Visual recap" link in the side-quest tile

That entry point stays — it's a useful per-quest shortcut. The new
Home-tab CTA is the discoverable one.

### 3. Verify the end-to-end flow

After wiring:
- Confirm `LOVABLE_API_KEY` exists via `fetch_secrets`; if missing,
  provision it with `ai_gateway--create` (the server fn uses it for
  text + image generation).
- Click the CTA from `/play` → lands on `/recap`.
- Paste a short transcript, walk the 6 questions, hit Generate.
- Inspect console + network for errors; if image generation rate-limits
  or fails, the existing code keeps text and falls back to placeholder
  slots (already implemented).
- Confirm the chosen format (Comic / Zine / Cards) renders the matching
  layout in `recap-result.tsx`.

## Files

- edit: `src/routes/play.tsx` — add the Home-tab CTA card.
- verify only (no edits expected): `src/routes/recap.tsx`,
  `src/lib/visual-recap.functions.ts`, `src/lib/recap-generator.ts`,
  `src/components/recap/recap-result.tsx`,
  `src/components/recap/image-slot.tsx`.

## Out of scope

No backend / RLS / data changes. No rebuild of the recap page itself
unless verification surfaces a real bug — in which case I'll fix only
what's broken.
