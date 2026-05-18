
-- Allow anonymous attendees (no auth user)
ALTER TABLE public.attendees ALTER COLUMN user_id DROP NOT NULL;

-- Anonymous attendee signup + reads
CREATE POLICY "anon insert attendee" ON public.attendees
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "anon read attendees" ON public.attendees
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon update attendees" ON public.attendees
  FOR UPDATE TO anon USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

-- Anonymous quest reads + completions
CREATE POLICY "anon read quests" ON public.quests
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon read completed" ON public.completed_quests
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon claim quest" ON public.completed_quests
  FOR INSERT TO anon WITH CHECK (true);

-- Admin manage quests for anon (demo mode)
CREATE POLICY "anon manage quests" ON public.quests
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Groups readable by anon
CREATE POLICY "anon read groups" ON public.groups
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon manage groups" ON public.groups
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Storage: allow anon upload + read on quest-photos
CREATE POLICY "anon upload quest photos" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'quest-photos');
CREATE POLICY "anon read quest photos" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'quest-photos');

-- Update claim_quest to work without auth.uid()
CREATE OR REPLACE FUNCTION public.claim_quest_anon(_attendee_id uuid, _quest_id uuid, _photo_url text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _points int;
  _new_total int;
  _completed_id uuid;
BEGIN
  IF _photo_url IS NULL OR length(trim(_photo_url)) = 0 THEN
    RAISE EXCEPTION 'photo required';
  END IF;
  SELECT points_awarded INTO _points FROM public.quests WHERE id = _quest_id;
  IF _points IS NULL THEN RAISE EXCEPTION 'quest not found'; END IF;
  INSERT INTO public.completed_quests (attendee_id, quest_id, quest_photo_url)
    VALUES (_attendee_id, _quest_id, _photo_url)
    RETURNING id INTO _completed_id;
  UPDATE public.attendees SET points = points + _points, updated_at = now()
    WHERE id = _attendee_id RETURNING points INTO _new_total;
  RETURN jsonb_build_object('points_awarded', _points, 'new_total', _new_total, 'completed_id', _completed_id);
END $$;

GRANT EXECUTE ON FUNCTION public.claim_quest_anon(uuid, uuid, text) TO anon, authenticated;
