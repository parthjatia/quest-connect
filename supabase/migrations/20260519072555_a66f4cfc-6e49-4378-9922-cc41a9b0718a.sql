
CREATE OR REPLACE FUNCTION public.claim_main_quest(_attendee_id uuid, _quest_id uuid, _photo_url text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _points int; _completed_id uuid;
BEGIN
  IF _photo_url IS NULL OR length(trim(_photo_url)) = 0 THEN RAISE EXCEPTION 'photo required'; END IF;
  SELECT points_awarded INTO _points FROM public.quests WHERE id = _quest_id;
  IF _points IS NULL THEN RAISE EXCEPTION 'quest not found'; END IF;

  INSERT INTO public.completed_quests (attendee_id, quest_id, quest_photo_url, verification_status)
    VALUES (_attendee_id, _quest_id, _photo_url, 'pending')
    ON CONFLICT (attendee_id, quest_id) DO UPDATE
      SET quest_photo_url = EXCLUDED.quest_photo_url,
          verification_status = 'pending',
          reviewer_note = NULL,
          verified_at = NULL,
          claimed_at = now()
    RETURNING id INTO _completed_id;

  RETURN jsonb_build_object('completed_id', _completed_id, 'status', 'pending', 'points_pending', _points);
END $$;

CREATE OR REPLACE FUNCTION public.review_main_quest(_completed_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _attendee uuid; _quest uuid; _points int; _new_total int;
BEGIN
  SELECT cq.attendee_id, cq.quest_id, q.points_awarded
    INTO _attendee, _quest, _points
    FROM public.completed_quests cq
    JOIN public.quests q ON q.id = cq.quest_id
    WHERE cq.id = _completed_id;
  IF _attendee IS NULL THEN RAISE EXCEPTION 'completion not found'; END IF;

  IF _approve THEN
    UPDATE public.completed_quests
      SET verification_status='approved', verified_at=now(), reviewer_note=_note
      WHERE id=_completed_id;
    _new_total := public.recalc_attendee_points(_attendee);
    RETURN jsonb_build_object('status','approved','points_awarded',_points,'new_total',_new_total);
  ELSE
    UPDATE public.completed_quests
      SET verification_status='rejected', verified_at=now(), reviewer_note=_note
      WHERE id=_completed_id;
    _new_total := public.recalc_attendee_points(_attendee);
    RETURN jsonb_build_object('status','rejected','new_total',_new_total);
  END IF;
END $$;
