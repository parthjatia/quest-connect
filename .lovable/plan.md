## EventQuest — Plan

A gamified event app with onboarding, a quest-board dashboard, an organizer admin view, and a Spotify-Wrapped-style comic recap.

### Stack
- TanStack Start + React + Tailwind + shadcn/ui (already scaffolded)
- Lovable Cloud (Supabase under the hood) for DB + auth + AI
- Lovable AI Gateway (`google/gemini-3-flash-preview` for text, `google/gemini-3.1-flash-image-preview` for the comic illustration)

Note: I'll use Lovable Cloud instead of you running SQL manually — schema is applied via migrations and types are auto-generated. The shape matches your spec.

### Data model (migration)
- `attendees` — `id uuid pk`, `user_id uuid` (auth), `full_name`, `age int`, `country`, `university`, `academic_background`, `ai_experience` (enum: beginner/intermediate/power_user), `track_intent`, `event_goal`, `points int default 0`, `group_id uuid null → groups`, timestamps
- `groups` — `id uuid pk`, `group_name text`
- `quests` — `id uuid pk`, `title`, `description`, `type` (enum: main/side), `points_awarded int`
- `completed_quests` — `id uuid pk`, `attendee_id → attendees`, `quest_id → quests`, `claimed_at timestamptz default now()`, unique(attendee_id, quest_id)
- `user_roles` + `has_role()` for admin gating (per security best practice — roles never on profile table)
- RLS: attendees read all (for squad/leaderboard), update only own row; quests public read; completed_quests insert only for own attendee; admin-only writes to groups/quests via `has_role(auth.uid(),'admin')`
- Seed ~12 quests (main + fun side quests like "Take a group selfie", "Get a coffee together", "Meet someone from another track")

### Pages / routes
- `/` — landing → routes to `/onboarding` or `/dashboard` based on session
- `/onboarding` — multi-step intake form (shadcn Form + zod). Saves to `attendees`, links to `auth.uid()` (anonymous sign-in so we skip password friction; can be upgraded later)
- `/dashboard` — Player Dashboard
  - Stats bar: points, rank, quests completed
  - My Squad: group members (if `group_id` set), else "Awaiting matchmaking"
  - Quest Board: bingo-grid of quests, claim button → inserts `completed_quests` + increments `points` (server function, atomic)
- `/admin` — gated by `admin` role
  - Live leaderboard (realtime subscription on `attendees.points`)
  - "Run AI Matchmaker" button → server function: pulls unassigned attendees, calls Gemini to cluster into diverse pods of 5, creates `groups` rows and assigns `group_id`s. (Mockable first run with a deterministic shuffle; AI path wired and ready.)
- `/wrapped` — Event Wrapped
  - Dark comic-book aesthetic, full-screen panels, scroll/tap to advance
  - `generateEventWrapped(attendeeId)` server function: fetches completed quests → Gemini text ("Hero's Journey" paragraph) → Gemini image (comic-book illustration). Caches result on the attendee row.

### Server functions (`createServerFn`)
- `submitOnboarding`, `claimQuest`, `runMatchmaker` (admin), `generateEventWrapped`
- All user-scoped fns use `requireSupabaseAuth`; matchmaker checks admin role

### Design vibe
- Vibrant gamified palette (electric indigo + neon mint accents on near-black), bold display headings, card/bingo grid with subtle hover lift, confetti on quest claim, comic halftone + speech-bubble treatment on Wrapped page
- All colors via semantic tokens in `src/styles.css`

### Build order (this turn)
1. Enable Lovable Cloud + migration (tables, enums, RLS, seed quests, roles)
2. Design tokens + shared layout
3. Onboarding page + server fn
4. Player Dashboard with quest board + claim flow
5. Admin dashboard + mock matchmaker (Gemini-ready)
6. Event Wrapped page + AI generation fn

### About your uploaded file
`hackathon_mock_attendees.xlsx` has: Full Name, University, Academic Background, AI Experience, Track, Goal (no Age/Country columns). I can seed the `attendees` table with these ~rows so the leaderboard/matchmaker have realistic data out of the gate — Age/Country will be left null. Confirm if you want this seeding included, otherwise I'll skip and the DB starts empty.
