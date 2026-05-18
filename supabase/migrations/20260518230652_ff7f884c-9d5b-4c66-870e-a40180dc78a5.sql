
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS end_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS quests_one_live_main
  ON public.quests (is_live)
  WHERE is_live = true AND type = 'main'::quest_type;

CREATE UNIQUE INDEX IF NOT EXISTS completed_quests_attendee_quest_uniq
  ON public.completed_quests (attendee_id, quest_id);

CREATE OR REPLACE FUNCTION public.recalc_attendee_points(_attendee_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _total int;
BEGIN
  SELECT COALESCE(SUM(q.points_awarded), 0) INTO _total
    FROM public.completed_quests cq JOIN public.quests q ON q.id = cq.quest_id
    WHERE cq.attendee_id = _attendee_id;
  UPDATE public.attendees SET points = _total, updated_at = now() WHERE id = _attendee_id;
  RETURN _total;
END $$;

CREATE OR REPLACE FUNCTION public.claim_quest(_quest_id uuid, _photo_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _attendee_id uuid; _points int; _new_total int; _completed_id uuid;
BEGIN
  IF _photo_url IS NULL OR length(trim(_photo_url)) = 0 THEN RAISE EXCEPTION 'photo required'; END IF;
  SELECT id INTO _attendee_id FROM public.attendees WHERE user_id = auth.uid();
  IF _attendee_id IS NULL THEN RAISE EXCEPTION 'attendee not found'; END IF;
  SELECT points_awarded INTO _points FROM public.quests WHERE id = _quest_id;
  IF _points IS NULL THEN RAISE EXCEPTION 'quest not found'; END IF;
  INSERT INTO public.completed_quests (attendee_id, quest_id, quest_photo_url)
    VALUES (_attendee_id, _quest_id, _photo_url)
    ON CONFLICT (attendee_id, quest_id) DO NOTHING
    RETURNING id INTO _completed_id;
  _new_total := public.recalc_attendee_points(_attendee_id);
  RETURN jsonb_build_object('points_awarded', _points, 'new_total', _new_total, 'completed_id', _completed_id);
END $$;

CREATE OR REPLACE FUNCTION public.claim_quest_anon(_attendee_id uuid, _quest_id uuid, _photo_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _points int; _new_total int; _completed_id uuid;
BEGIN
  IF _photo_url IS NULL OR length(trim(_photo_url)) = 0 THEN RAISE EXCEPTION 'photo required'; END IF;
  SELECT points_awarded INTO _points FROM public.quests WHERE id = _quest_id;
  IF _points IS NULL THEN RAISE EXCEPTION 'quest not found'; END IF;
  INSERT INTO public.completed_quests (attendee_id, quest_id, quest_photo_url)
    VALUES (_attendee_id, _quest_id, _photo_url)
    ON CONFLICT (attendee_id, quest_id) DO NOTHING
    RETURNING id INTO _completed_id;
  _new_total := public.recalc_attendee_points(_attendee_id);
  RETURN jsonb_build_object('points_awarded', _points, 'new_total', _new_total, 'completed_id', _completed_id);
END $$;

CREATE OR REPLACE FUNCTION public.approve_group_submission(_submission_id uuid, _note text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _sub public.group_quest_submissions%ROWTYPE; _points int; _member RECORD; _awarded int := 0;
BEGIN
  SELECT * INTO _sub FROM public.group_quest_submissions WHERE id = _submission_id;
  IF _sub.id IS NULL THEN RAISE EXCEPTION 'submission not found'; END IF;
  IF _sub.status = 'approved' THEN RAISE EXCEPTION 'already approved'; END IF;
  SELECT points_awarded INTO _points FROM public.quests WHERE id = _sub.quest_id;
  IF _points IS NULL THEN RAISE EXCEPTION 'quest not found'; END IF;
  UPDATE public.group_quest_submissions SET status='approved', reviewer_note=_note, reviewed_at=now() WHERE id=_submission_id;
  FOR _member IN SELECT id FROM public.attendees WHERE group_id = _sub.group_id LOOP
    INSERT INTO public.completed_quests (attendee_id, quest_id, quest_photo_url)
      VALUES (_member.id, _sub.quest_id, _sub.photo_url)
      ON CONFLICT (attendee_id, quest_id) DO NOTHING;
    PERFORM public.recalc_attendee_points(_member.id);
    _awarded := _awarded + 1;
  END LOOP;
  RETURN jsonb_build_object('members_awarded', _awarded, 'points_each', _points);
END $$;

CREATE OR REPLACE FUNCTION public.pod_component(_attendee_id uuid)
RETURNS uuid[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _gid uuid; _comp uuid[] := ARRAY[_attendee_id]; _added int := 1;
BEGIN
  SELECT group_id INTO _gid FROM public.attendees WHERE id = _attendee_id;
  IF _gid IS NULL THEN RETURN _comp; END IF;
  WHILE _added > 0 LOOP
    WITH new_nodes AS (
      SELECT DISTINCT n FROM (
        SELECT verified_id AS n FROM public.pod_verifications WHERE group_id=_gid AND verifier_id = ANY(_comp)
        UNION
        SELECT verifier_id AS n FROM public.pod_verifications WHERE group_id=_gid AND verified_id = ANY(_comp)
      ) s WHERE NOT (n = ANY(_comp))
    )
    SELECT array_cat(_comp, COALESCE(array_agg(n), ARRAY[]::uuid[])), COALESCE(count(*),0)
      INTO _comp, _added FROM new_nodes;
  END LOOP;
  RETURN _comp;
END $$;

-- Backfill any drift
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT id FROM public.attendees LOOP
    PERFORM public.recalc_attendee_points(r.id);
  END LOOP;
END $$;
