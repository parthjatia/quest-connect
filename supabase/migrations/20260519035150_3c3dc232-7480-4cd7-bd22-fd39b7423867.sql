
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS created_by_sponsor text,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS quests_approval_status_idx
  ON public.quests (approval_status);
