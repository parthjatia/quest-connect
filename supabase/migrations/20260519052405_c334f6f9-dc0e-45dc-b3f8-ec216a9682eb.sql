
CREATE OR REPLACE FUNCTION public.admin_clear_attendees_and_pods()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _attendees_deleted int;
  _pods_deleted int;
BEGIN
  DELETE FROM public.pod_verifications;
  DELETE FROM public.attendee_meets;
  DELETE FROM public.completed_quests;
  DELETE FROM public.group_quest_submissions;
  DELETE FROM public.quest_transcripts;

  UPDATE public.attendees SET group_id = NULL WHERE group_id IS NOT NULL;

  WITH d AS (DELETE FROM public.attendees RETURNING 1)
  SELECT count(*) INTO _attendees_deleted FROM d;

  WITH d AS (DELETE FROM public.groups RETURNING 1)
  SELECT count(*) INTO _pods_deleted FROM d;

  RETURN jsonb_build_object(
    'attendees_deleted', _attendees_deleted,
    'pods_deleted', _pods_deleted
  );
END
$$;
