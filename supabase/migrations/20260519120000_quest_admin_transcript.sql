-- Event-level transcript for main quests (uploaded by organizer, not per-attendee)
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS transcript_url text;
