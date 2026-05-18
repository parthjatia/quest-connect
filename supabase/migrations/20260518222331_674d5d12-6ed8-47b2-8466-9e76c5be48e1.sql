
-- 1. Verification code on attendees
ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS verify_code text;

CREATE OR REPLACE FUNCTION public.gen_verify_code()
RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT upper(lpad(to_hex((random() * 65535)::int), 4, '0'))
$$;

-- Backfill existing rows
UPDATE public.attendees SET verify_code = public.gen_verify_code() WHERE verify_code IS NULL;

-- Default for new rows
ALTER TABLE public.attendees ALTER COLUMN verify_code SET DEFAULT public.gen_verify_code();
ALTER TABLE public.attendees ALTER COLUMN verify_code SET NOT NULL;

-- 2. Pod verifications (verifier confirmed they met verified)
CREATE TABLE IF NOT EXISTS public.pod_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  verifier_id uuid NOT NULL,
  verified_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (verifier_id, verified_id)
);
ALTER TABLE public.pod_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon read pod verifications" ON public.pod_verifications FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert pod verifications" ON public.pod_verifications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "authed read pod verifications" ON public.pod_verifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "authed insert pod verifications" ON public.pod_verifications FOR INSERT TO authenticated WITH CHECK (true);

-- Verify-by-code RPC: looks up verified attendee by code within the pod, inserts row
CREATE OR REPLACE FUNCTION public.verify_pod_member(_verifier_id uuid, _code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _verifier_group uuid;
  _verified public.attendees%ROWTYPE;
BEGIN
  SELECT group_id INTO _verifier_group FROM public.attendees WHERE id = _verifier_id;
  IF _verifier_group IS NULL THEN RAISE EXCEPTION 'verifier has no pod'; END IF;
  SELECT * INTO _verified FROM public.attendees
    WHERE group_id = _verifier_group
      AND id <> _verifier_id
      AND upper(verify_code) = upper(_code)
    LIMIT 1;
  IF _verified.id IS NULL THEN RAISE EXCEPTION 'no pod member with that code'; END IF;
  INSERT INTO public.pod_verifications (group_id, verifier_id, verified_id)
    VALUES (_verifier_group, _verifier_id, _verified.id)
    ON CONFLICT (verifier_id, verified_id) DO NOTHING;
  RETURN jsonb_build_object('verified_id', _verified.id, 'verified_name', _verified.full_name);
END $$;

-- 3. Group side-quest submissions
DO $$ BEGIN
  CREATE TYPE public.submission_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.group_quest_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  quest_id uuid NOT NULL,
  photo_url text NOT NULL,
  submitted_by uuid NOT NULL,
  status public.submission_status NOT NULL DEFAULT 'pending',
  reviewer_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.group_quest_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon read submissions" ON public.group_quest_submissions FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert submissions" ON public.group_quest_submissions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update submissions" ON public.group_quest_submissions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authed read submissions" ON public.group_quest_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "authed manage submissions" ON public.group_quest_submissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Approve: mark approved, award points to every group member, write completed_quests rows
CREATE OR REPLACE FUNCTION public.approve_group_submission(_submission_id uuid, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _sub public.group_quest_submissions%ROWTYPE;
  _points int;
  _member RECORD;
  _awarded int := 0;
BEGIN
  SELECT * INTO _sub FROM public.group_quest_submissions WHERE id = _submission_id;
  IF _sub.id IS NULL THEN RAISE EXCEPTION 'submission not found'; END IF;
  IF _sub.status = 'approved' THEN RAISE EXCEPTION 'already approved'; END IF;
  SELECT points_awarded INTO _points FROM public.quests WHERE id = _sub.quest_id;
  IF _points IS NULL THEN RAISE EXCEPTION 'quest not found'; END IF;

  UPDATE public.group_quest_submissions
    SET status = 'approved', reviewer_note = _note, reviewed_at = now()
    WHERE id = _submission_id;

  FOR _member IN SELECT id FROM public.attendees WHERE group_id = _sub.group_id LOOP
    INSERT INTO public.completed_quests (attendee_id, quest_id, quest_photo_url)
      VALUES (_member.id, _sub.quest_id, _sub.photo_url)
      ON CONFLICT DO NOTHING;
    UPDATE public.attendees SET points = points + _points, updated_at = now()
      WHERE id = _member.id;
    _awarded := _awarded + 1;
  END LOOP;
  RETURN jsonb_build_object('members_awarded', _awarded, 'points_each', _points);
END $$;

CREATE OR REPLACE FUNCTION public.reject_group_submission(_submission_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.group_quest_submissions
    SET status = 'rejected', reviewer_note = _note, reviewed_at = now()
    WHERE id = _submission_id;
END $$;

-- 4. Groups: default name
ALTER TABLE public.groups ALTER COLUMN group_name SET DEFAULT 'Unnamed pod';
