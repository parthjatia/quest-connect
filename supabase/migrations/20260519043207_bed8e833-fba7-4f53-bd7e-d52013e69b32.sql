
CREATE TYPE public.track_intent AS ENUM (
  'ai_for_business','creative_marketing','dev_tools_infra','fintech_payments','health_sustainability','open_track'
);
CREATE TYPE public.event_goal AS ENUM (
  'working_product','job_internship','experience','new_connections'
);

ALTER TABLE public.attendees ADD COLUMN track_intent_new public.track_intent;
ALTER TABLE public.attendees ADD COLUMN event_goal_new public.event_goal;

UPDATE public.attendees SET track_intent_new = CASE
  WHEN track_intent ILIKE '%fintech%' OR track_intent ILIKE '%payment%' OR track_intent ILIKE '%finance%' THEN 'fintech_payments'::public.track_intent
  WHEN track_intent ILIKE '%dev%' OR track_intent ILIKE '%tool%' OR track_intent ILIKE '%infra%' OR track_intent ILIKE '%api%' THEN 'dev_tools_infra'::public.track_intent
  WHEN track_intent ILIKE '%creative%' OR track_intent ILIKE '%market%' OR track_intent ILIKE '%design%' OR track_intent ILIKE '%content%' THEN 'creative_marketing'::public.track_intent
  WHEN track_intent ILIKE '%health%' OR track_intent ILIKE '%sustain%' OR track_intent ILIKE '%climate%' OR track_intent ILIKE '%medical%' THEN 'health_sustainability'::public.track_intent
  WHEN track_intent ILIKE '%business%' OR track_intent ILIKE '%enterprise%' OR track_intent ILIKE '%b2b%' THEN 'ai_for_business'::public.track_intent
  WHEN track_intent IS NOT NULL AND length(trim(track_intent)) > 0 THEN 'open_track'::public.track_intent
  ELSE NULL
END;

UPDATE public.attendees SET event_goal_new = CASE
  WHEN event_goal ILIKE '%product%' OR event_goal ILIKE '%build%' OR event_goal ILIKE '%ship%' THEN 'working_product'::public.event_goal
  WHEN event_goal ILIKE '%job%' OR event_goal ILIKE '%intern%' OR event_goal ILIKE '%hire%' OR event_goal ILIKE '%career%' THEN 'job_internship'::public.event_goal
  WHEN event_goal ILIKE '%connect%' OR event_goal ILIKE '%network%' OR event_goal ILIKE '%meet%' OR event_goal ILIKE '%friend%' THEN 'new_connections'::public.event_goal
  WHEN event_goal IS NOT NULL AND length(trim(event_goal)) > 0 THEN 'experience'::public.event_goal
  ELSE NULL
END;

ALTER TABLE public.attendees DROP COLUMN track_intent;
ALTER TABLE public.attendees RENAME COLUMN track_intent_new TO track_intent;
ALTER TABLE public.attendees DROP COLUMN event_goal;
ALTER TABLE public.attendees RENAME COLUMN event_goal_new TO event_goal;
