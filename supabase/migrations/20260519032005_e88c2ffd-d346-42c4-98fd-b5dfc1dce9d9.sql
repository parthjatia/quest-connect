ALTER TABLE public.attendees
  ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS goals TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS track TEXT,
  ADD COLUMN IF NOT EXISTS personality_tags TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS current_zone TEXT,
  ADD COLUMN IF NOT EXISTS discovery_visibility BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sponsor_open BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS met_attendee_ids UUID[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS quest_activity_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS looking_for TEXT;

ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS transcript_url TEXT;