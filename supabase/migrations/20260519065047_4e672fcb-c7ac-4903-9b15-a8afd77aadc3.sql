-- Sponsor-verified side quest claims
ALTER TABLE public.completed_quests
  ADD COLUMN IF NOT EXISTS proof_link text,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by_sponsor text,
  ADD COLUMN IF NOT EXISTS reviewer_note text;

-- Replace recalc to only count auto + approved completions
CREATE OR REPLACE FUNCTION public.recalc_attendee_points(_attendee_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _quest_total int; _pod_bonus int; _meet_bonus int; _total int;
BEGIN
  SELECT COALESCE(SUM(q.points_awarded), 0) INTO _quest_total
    FROM public.completed_quests cq
    JOIN public.quests q ON q.id = cq.quest_id
    WHERE cq.attendee_id = _attendee_id
      AND cq.verification_status IN ('auto','approved');
  SELECT COALESCE(pod_bonus_points, 0), COALESCE(meet_bonus_points, 0)
    INTO _pod_bonus, _meet_bonus
    FROM public.attendees WHERE id = _attendee_id;
  _total := _quest_total + COALESCE(_pod_bonus,0) + COALESCE(_meet_bonus,0);
  UPDATE public.attendees SET points = _total, updated_at = now() WHERE id = _attendee_id;
  RETURN _total;
END $function$;

-- Player submits a sponsor side quest proof link (anon-friendly, attendee_id passed in)
CREATE OR REPLACE FUNCTION public.claim_sponsor_quest(_attendee_id uuid, _quest_id uuid, _proof_link text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _sponsor text; _completed_id uuid;
BEGIN
  IF _proof_link IS NULL OR length(trim(_proof_link)) = 0 THEN RAISE EXCEPTION 'proof link required'; END IF;
  SELECT created_by_sponsor INTO _sponsor FROM public.quests WHERE id = _quest_id;
  IF _sponsor IS NULL THEN RAISE EXCEPTION 'not a sponsor quest'; END IF;

  INSERT INTO public.completed_quests (attendee_id, quest_id, proof_link, verification_status)
    VALUES (_attendee_id, _quest_id, _proof_link, 'pending')
    ON CONFLICT (attendee_id, quest_id) DO UPDATE
      SET proof_link = EXCLUDED.proof_link,
          verification_status = 'pending',
          reviewer_note = NULL,
          verified_at = NULL,
          verified_by_sponsor = NULL,
          claimed_at = now()
    RETURNING id INTO _completed_id;

  RETURN jsonb_build_object('completed_id', _completed_id, 'status', 'pending');
END $function$;

-- Sponsor reviews a pending submission (handle is verified against quest)
CREATE OR REPLACE FUNCTION public.sponsor_review_completion(_completed_id uuid, _sponsor_handle text, _approve boolean, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _attendee uuid; _quest uuid; _owner text;
BEGIN
  SELECT cq.attendee_id, cq.quest_id, q.created_by_sponsor
    INTO _attendee, _quest, _owner
    FROM public.completed_quests cq
    JOIN public.quests q ON q.id = cq.quest_id
    WHERE cq.id = _completed_id;
  IF _attendee IS NULL THEN RAISE EXCEPTION 'completion not found'; END IF;
  IF _owner IS NULL OR lower(_owner) <> lower(_sponsor_handle) THEN
    RAISE EXCEPTION 'not your quest';
  END IF;

  IF _approve THEN
    UPDATE public.completed_quests
      SET verification_status='approved', verified_at=now(), verified_by_sponsor=_sponsor_handle, reviewer_note=_note
      WHERE id=_completed_id;
    PERFORM public.recalc_attendee_points(_attendee);
    RETURN jsonb_build_object('status','approved');
  ELSE
    UPDATE public.completed_quests
      SET verification_status='rejected', verified_at=now(), verified_by_sponsor=_sponsor_handle, reviewer_note=_note
      WHERE id=_completed_id;
    PERFORM public.recalc_attendee_points(_attendee);
    RETURN jsonb_build_object('status','rejected');
  END IF;
END $function$;
