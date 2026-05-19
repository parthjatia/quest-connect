# Plan: Rebuild Personalized Visual Recap at `/recap`

Goal: A single-page, premium dark, glassy experience that turns a transcript + 6 preference answers into a 7-section visual recap with AI-generated images. Keep all existing features intact (admin transcript upload + main-quest modal remain untouched).

## Scope

- Add a brand new route `src/routes/recap.tsx` that contains the entire flow on one page (no multi-page routing).
- Reuse existing logic (`recap-store.ts`, `recap-generator.ts`, `visual-recap.functions.ts`) but wrap it in a fresh, premium UI.
- Add a link entry from the attendee experience (header/sidebar where attendee nav lives) so users can reach `/recap`.
- Leave `MainQuestRecapModal`, admin transcript upload, and all unrelated features untouched.

## Page structure (single scrollable page on `/recap`)

1. **Hero** — Title "Turn any transcript into your personal visual recap", subtitle, animated floating glass panels, cyan glow, abstract shapes.
2. **Transcript Input card** — Large glass textarea, `.txt` drag & drop + file picker, live word count, empty validation, clear/reset.
3. **Six preference questions** — Each question rendered as a row of premium selectable glass cards (not radios), with hover shine, selected state with glowing border. Exact options as specified in the brief.
4. **Generate bar** — Sticky CTA "Generate My Visual Recap"; disabled until transcript non-empty AND all 6 answered; shows inline validation hints.
5. **Cinematic loading overlay** — Full-screen glass overlay with 5 animated steps (Reading transcript → Extracting key moments → Building your recap → Creating visual scenes → Placing images into your story), progress shimmer, abstract motion.
6. **Result** — Renders the 7 sections in the chosen layout (comic panels / magazine zine / collectible cards), styled by visual world (storybook/hero/manga) and intensity (calm/balanced/bold). Small `Template: <templateId>` debug chip in the corner.

## Logic

- `getTemplateId(prefs)` already exists as `deriveTemplateId` in `recap-store.ts` — reuse.
- `generatePersonalizedRecap(transcript, prefs, templateId)`:
  - Primary path: call existing `generateVisualRecap` server function (`src/lib/visual-recap.functions.ts`) which already calls Lovable AI Gateway for both text + 6 image slots and returns `{ recap, images }`.
  - Fallback path: existing `generatePersonalizedRecap` in `src/lib/recap-generator.ts` (transcript-aware local generator). Use this if the server function throws.
- Image slots: `coverHero`, `bigPictureScene`, `keyMoment_1..3`, `finalMemory` — already returned by the server function. Progressive: render text immediately; swap placeholders with real images as the promise resolves.
- All AI calls remain server-side via `createServerFn`; `LOVABLE_API_KEY` stays in env (already configured).

## Result layout variants (driven by Q5)

- **Comic panels** — Sequential bordered panels with caption bars and speech-bubble accents. Images fill panel tops with wide aspect.
- **Magazine / zine** — Asymmetric editorial grid, pull quotes, layered glass cards, side-by-side text + image blocks.
- **Collectible cards** — Horizontal snap-scroll row of premium cards; each section = one card with square image on top, badge/stat strip, body text.

Style variants (Q4: storybook/hero/manga) and intensity (Q6: calm/balanced/bold) tune borders, glow strength, type scale, motion, and decoration density via CSS tokens.

## Design system additions (`src/styles.css`)

- New semantic tokens for the recap surface only (do not change global tokens):
  - `--recap-bg` deep midnight, `--recap-surface` glass, `--recap-border`, `--recap-glow-cyan`, `--recap-glow-blue`, `--recap-text`, `--recap-text-muted`, `--recap-shine` gradient.
- Utility classes: `.recap-glass`, `.recap-glow`, `.recap-shine` (animated sheen sweep), `.recap-float` (slow drift).
- All colors via tokens; no hard-coded hex in components.

## Component breakdown (new, scoped under `src/components/recap/v2/`)

- `RecapHero.tsx` — hero + floating shapes.
- `TranscriptInput.tsx` — textarea + dropzone + word count.
- `PreferenceQuestion.tsx` — reusable card-grid single-select.
- `PreferencePanel.tsx` — renders all 6 questions.
- `GenerateBar.tsx` — sticky CTA with validation.
- `LoadingOverlay.tsx` — 5-step cinematic loader.
- `RecapResult.tsx` — top-level renderer; dispatches to layout variant.
- `layouts/ComicLayout.tsx`, `layouts/MagazineLayout.tsx`, `layouts/CardsLayout.tsx`.
- `ImageSlot.tsx` — premium shimmer placeholder + progressive real image swap with correct aspect ratio per layout.

The existing `src/components/recap/*` files used by `MainQuestRecapModal` stay as-is and untouched so the main quest flow keeps working.

## Navigation

- Add a "Visual Recap" link in the attendee header/nav (wherever attendee menu items live in `app-header.tsx`). No route changes elsewhere.

## Robustness

- Never crash if AI fails: catch server-fn errors, surface a small toast, fall back to local transcript-aware recap + animated placeholders for images.
- Text recap always renders first; images stream in.
- Empty transcript / unanswered questions blocked with inline messages.

## Out of scope (explicitly preserved)

- Admin transcript upload on quests — unchanged.
- `MainQuestRecapModal` — unchanged.
- Database schema, RLS, auth, routes other than adding `/recap`.
- No changes to existing recap logic files beyond importing them.

## Files to add

- `src/routes/recap.tsx`
- `src/components/recap/v2/` (components listed above)
- CSS additions appended to `src/styles.css`

## Files to edit

- `src/components/app-header.tsx` — add nav link to `/recap` for attendees.
- `src/styles.css` — add recap tokens + utilities.

Routes file `src/routeTree.gen.ts` regenerates automatically.
