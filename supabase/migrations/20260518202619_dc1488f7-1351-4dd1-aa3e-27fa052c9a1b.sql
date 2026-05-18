
-- 1. Storage bucket for quest proof photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('quest-photos', 'quest-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: public read, authed users write/delete only in their own user-id folder
CREATE POLICY "quest photos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'quest-photos');

CREATE POLICY "users upload own quest photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'quest-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users update own quest photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'quest-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users delete own quest photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'quest-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 2. New columns
ALTER TABLE public.completed_quests
  ADD COLUMN IF NOT EXISTS quest_photo_url text,
  ADD COLUMN IF NOT EXISTS ai_feedback text;

ALTER TABLE public.attendees
  ADD COLUMN IF NOT EXISTS icebreakers text;

-- 3. Update claim_quest to require a photo URL
CREATE OR REPLACE FUNCTION public.claim_quest(_quest_id uuid, _photo_url text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _attendee_id uuid;
  _points int;
  _new_total int;
  _completed_id uuid;
BEGIN
  IF _photo_url IS NULL OR length(trim(_photo_url)) = 0 THEN
    RAISE EXCEPTION 'photo required';
  END IF;
  SELECT id INTO _attendee_id FROM public.attendees WHERE user_id = auth.uid();
  IF _attendee_id IS NULL THEN RAISE EXCEPTION 'attendee not found'; END IF;
  SELECT points_awarded INTO _points FROM public.quests WHERE id = _quest_id;
  IF _points IS NULL THEN RAISE EXCEPTION 'quest not found'; END IF;
  INSERT INTO public.completed_quests (attendee_id, quest_id, quest_photo_url)
    VALUES (_attendee_id, _quest_id, _photo_url)
    RETURNING id INTO _completed_id;
  UPDATE public.attendees SET points = points + _points, updated_at = now()
    WHERE id = _attendee_id RETURNING points INTO _new_total;
  RETURN jsonb_build_object('points_awarded', _points, 'new_total', _new_total, 'completed_id', _completed_id);
END $function$;

-- Drop the old single-arg signature so callers must pass the photo
DROP FUNCTION IF EXISTS public.claim_quest(uuid);
