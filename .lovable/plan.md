## Goal
Soften (brighten) the text on the `/play` screen so it reads lighter against the dark background, without changing any wording or affecting other screens.

## Approach
Scope the change to `/play` only. Wrap the page root in a small class that overrides the two text tokens that drive almost every label on the screen:

- `--muted-foreground` → bump from `oklch(0.72 0.025 240)` to roughly `oklch(0.88 0.02 240)` (used by all the small caption/meta text, tab labels, etc.)
- `--foreground` → bump from `oklch(0.98 0.005 240)` to a slightly softer pure light `oklch(0.985 0.004 240)` so headings stay crisp but not harsh

Implementation: add a `.play-light-text` utility in `src/styles.css` that redefines those two CSS variables, then apply it to the root `<div>` of `PlayPage` in `src/routes/play.tsx` (line 254, alongside the existing `bg-background text-foreground` classes).

Because every text element on `/play` already uses `text-foreground` or `text-muted-foreground` semantic tokens, this single override lightens them all consistently — no per-element edits, no risk of touching other routes.

## Files to change
- `src/styles.css` — add the scoped `.play-light-text` token override
- `src/routes/play.tsx` — add `play-light-text` to the page root container

## Out of scope
- No copy changes
- No layout, spacing, or component changes
- No changes to other routes (onboarding, auth, sponsor, admin, recap, wrapped)