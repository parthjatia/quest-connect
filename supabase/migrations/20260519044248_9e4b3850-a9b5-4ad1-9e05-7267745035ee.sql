ALTER TABLE public.attendees
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS github_url text,
  ADD COLUMN IF NOT EXISTS hobbies text[] NOT NULL DEFAULT '{}'::text[];