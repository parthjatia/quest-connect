
-- Bonus points columns
ALTER TABLE public.attendees
  ADD COLUMN IF NOT EXISTS pod_bonus_points int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meet_bonus_points int NOT NULL DEFAULT 0;

-- Meets table for cross-pod code exchanges
CREATE TABLE IF NOT EXISTS public.attendee_meets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id uuid NOT NULL,
  met_attendee_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attendee_id, met_attendee_id),
  CHECK (attendee_id <> met_attendee_id)
);

ALTER TABLE public.attendee_meets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read meets" ON public.attendee_meets FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert meets" ON public.attendee_meets FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "authed read meets" ON public.attendee_meets FOR SELECT TO authenticated USING (true);
CREATE POLICY "authed insert meets" ON public.attendee_meets FOR INSERT TO authenticated WITH CHECK (true);

-- Replace recalc to include bonuses
CREATE OR REPLACE FUNCTION public.recalc_attendee_points(_attendee_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _quest_total int; _pod_bonus int; _meet_bonus int; _total int;
BEGIN
  SELECT COALESCE(SUM(q.points_awarded), 0) INTO _quest_total
    FROM public.completed_quests cq JOIN public.quests q ON q.id = cq.quest_id
    WHERE cq.attendee_id = _attendee_id;
  SELECT COALESCE(pod_bonus_points, 0), COALESCE(meet_bonus_points, 0)
    INTO _pod_bonus, _meet_bonus
    FROM public.attendees WHERE id = _attendee_id;
  _total := _quest_total + COALESCE(_pod_bonus,0) + COALESCE(_meet_bonus,0);
  UPDATE public.attendees SET points = _total, updated_at = now() WHERE id = _attendee_id;
  RETURN _total;
END $function$;

-- Trigger: award +4 to both sides on new pod verification
CREATE OR REPLACE FUNCTION public.award_pod_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.attendees SET pod_bonus_points = pod_bonus_points + 4 WHERE id = NEW.verifier_id;
  UPDATE public.attendees SET pod_bonus_points = pod_bonus_points + 4 WHERE id = NEW.verified_id;
  PERFORM public.recalc_attendee_points(NEW.verifier_id);
  PERFORM public.recalc_attendee_points(NEW.verified_id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_pod_verification_award ON public.pod_verifications;
CREATE TRIGGER on_pod_verification_award
  AFTER INSERT ON public.pod_verifications
  FOR EACH ROW EXECUTE FUNCTION public.award_pod_verification();

-- meet_attendee RPC
CREATE OR REPLACE FUNCTION public.meet_attendee(_attendee_id uuid, _code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _me public.attendees%ROWTYPE; _other public.attendees%ROWTYPE; _ins1 int := 0; _ins2 int := 0;
BEGIN
  SELECT * INTO _me FROM public.attendees WHERE id = _attendee_id;
  IF _me.id IS NULL THEN RAISE EXCEPTION 'attendee not found'; END IF;
  SELECT * INTO _other FROM public.attendees WHERE upper(verify_code) = upper(_code) LIMIT 1;
  IF _other.id IS NULL THEN RAISE EXCEPTION 'no attendee with that code'; END IF;
  IF _other.id = _me.id THEN RAISE EXCEPTION 'that is your own code'; END IF;
  IF _me.group_id IS NOT NULL AND _me.group_id = _other.group_id THEN
    RAISE EXCEPTION 'pod member - use pod verify';
  END IF;

  WITH ins AS (
    INSERT INTO public.attendee_meets (attendee_id, met_attendee_id)
      VALUES (_me.id, _other.id) ON CONFLICT DO NOTHING RETURNING 1
  ) SELECT count(*) INTO _ins1 FROM ins;

  WITH ins AS (
    INSERT INTO public.attendee_meets (attendee_id, met_attendee_id)
      VALUES (_other.id, _me.id) ON CONFLICT DO NOTHING RETURNING 1
  ) SELECT count(*) INTO _ins2 FROM ins;

  IF _ins1 > 0 THEN
    UPDATE public.attendees SET meet_bonus_points = meet_bonus_points + 2,
      met_attendee_ids = (
        SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(met_attendee_ids, '{}'::uuid[]) || ARRAY[_other.id]))
      )
      WHERE id = _me.id;
    PERFORM public.recalc_attendee_points(_me.id);
  END IF;
  IF _ins2 > 0 THEN
    UPDATE public.attendees SET meet_bonus_points = meet_bonus_points + 2,
      met_attendee_ids = (
        SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(met_attendee_ids, '{}'::uuid[]) || ARRAY[_me.id]))
      )
      WHERE id = _other.id;
    PERFORM public.recalc_attendee_points(_other.id);
  END IF;

  RETURN jsonb_build_object(
    'met_id', _other.id,
    'met_name', _other.full_name,
    'new_connection', _ins1 > 0
  );
END $$;
