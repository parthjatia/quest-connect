-- Vibe Map / Sponsor Radar attendee profile fields (safe ALTER, no data wipe)

ALTER TABLE public.attendees
  ADD COLUMN IF NOT EXISTS interests jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS goals jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS personality_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS track text,
  ADD COLUMN IF NOT EXISTS current_zone text NOT NULL DEFAULT 'Middle Left',
  ADD COLUMN IF NOT EXISTS discovery_visibility text NOT NULL DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS sponsor_open boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS met_attendee_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quest_activity_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS looking_for jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.attendees
  DROP CONSTRAINT IF EXISTS attendees_discovery_visibility_check;

ALTER TABLE public.attendees
  ADD CONSTRAINT attendees_discovery_visibility_check
  CHECK (discovery_visibility IN ('visible', 'anonymous', 'hidden'));

-- Sync track from legacy track_intent when empty
UPDATE public.attendees
SET track = COALESCE(NULLIF(trim(track), ''), NULLIF(trim(track_intent), ''), 'Startup')
WHERE track IS NULL OR trim(track) = '';

-- Quest activity from points when still zero
UPDATE public.attendees
SET quest_activity_score = LEAST(100, GREATEST(quest_activity_score, COALESCE(points, 0)))
WHERE quest_activity_score = 0 AND COALESCE(points, 0) > 0;

-- Deterministic zone spread for rows missing / default zone only
UPDATE public.attendees a
SET current_zone = z.name
FROM (
  SELECT id,
    (ARRAY[
      'Front Left', 'Front Right', 'Middle Left', 'Middle Right',
      'Back Area', 'Coffee Area', 'Sponsor Booths', 'Stage Area'
    ])[1 + (abs(hashtext(id::text)) % 8)] AS name
  FROM public.attendees
) z
WHERE a.id = z.id
  AND (
    a.current_zone IS NULL
    OR trim(a.current_zone) = ''
    OR a.current_zone = 'Middle Left'
  );

-- Seed goals from event_goal when goals array empty
UPDATE public.attendees
SET goals = jsonb_build_array(trim(event_goal))
WHERE (goals = '[]'::jsonb OR goals IS NULL)
  AND event_goal IS NOT NULL
  AND trim(event_goal) <> '';

-- Seed skills from academic_background when empty
UPDATE public.attendees
SET skills = jsonb_build_array(trim(academic_background))
WHERE (skills = '[]'::jsonb OR skills IS NULL)
  AND academic_background IS NOT NULL
  AND trim(academic_background) <> '';

-- AI experience -> personality tag
UPDATE public.attendees
SET personality_tags = personality_tags || '["beginner-friendly"]'::jsonb
WHERE ai_experience = 'beginner'
  AND NOT (personality_tags @> '["beginner-friendly"]'::jsonb);

UPDATE public.attendees
SET personality_tags = personality_tags || '["technical"]'::jsonb
WHERE ai_experience IN ('intermediate', 'power_user')
  AND NOT (personality_tags @> '["technical"]'::jsonb);

-- Deterministic interest packs (only when interests still empty)
UPDATE public.attendees a
SET
  interests = v.interests,
  goals = CASE WHEN a.goals = '[]'::jsonb THEN v.goals ELSE a.goals END,
  skills = CASE WHEN a.skills = '[]'::jsonb THEN v.skills ELSE a.skills END,
  personality_tags = CASE WHEN a.personality_tags = '[]'::jsonb THEN v.personality_tags ELSE a.personality_tags END,
  looking_for = CASE WHEN a.looking_for = '[]'::jsonb THEN v.looking_for ELSE a.looking_for END
FROM (
  SELECT
    id,
    (ARRAY[
      '["AI","startups","cloud"]'::jsonb,
      '["design","startups","education"]'::jsonb,
      '["fintech","business","consulting"]'::jsonb,
      '["basketball","sports tech","startups"]'::jsonb,
      '["gaming","AI","robotics"]'::jsonb,
      '["robotics","AI","cloud"]'::jsonb,
      '["sustainability","design","startups"]'::jsonb,
      '["consulting","business","fintech"]'::jsonb
    ])[1 + (abs(hashtext(id::text)) % 8)] AS interests,
    (ARRAY[
      '["internship","make friends"]'::jsonb,
      '["find cofounder","talk to sponsors"]'::jsonb,
      '["learn AI","build something impressive"]'::jsonb,
      '["create content","make friends"]'::jsonb,
      '["get product feedback","win"]'::jsonb,
      '["talk to sponsors","internship"]'::jsonb,
      '["find cofounder","build something impressive"]'::jsonb,
      '["make friends","just survive socially"]'::jsonb
    ])[1 + (abs(hashtext(id::text)) % 8)] AS goals,
    (ARRAY[
      '["backend","AI engineering"]'::jsonb,
      '["frontend","design"]'::jsonb,
      '["business","product"]'::jsonb,
      '["pitching","marketing"]'::jsonb,
      '["cloud","data science"]'::jsonb,
      '["backend","cloud"]'::jsonb,
      '["design","product"]'::jsonb,
      '["public speaking","business"]'::jsonb
    ])[1 + (abs(hashtext(id::text)) % 8)] AS skills,
    (ARRAY[
      '["curious","connector"]'::jsonb,
      '["serious builder","technical"]'::jsonb,
      '["strategic","extrovert"]'::jsonb,
      '["competitive","creative"]'::jsonb,
      '["beginner-friendly","curious"]'::jsonb,
      '["technical","introvert"]'::jsonb,
      '["connector","chill"]'::jsonb,
      '["extrovert","strategic"]'::jsonb
    ])[1 + (abs(hashtext(id::text)) % 8)] AS personality_tags,
    (ARRAY[
      '["AI mentors","internship"]'::jsonb,
      '["cofounder","sponsors"]'::jsonb,
      '["designers","feedback"]'::jsonb,
      '["sports tech people"]'::jsonb,
      '["teammates","gaming friends"]'::jsonb,
      '["robotics builders"]'::jsonb,
      '["impact founders"]'::jsonb,
      '["consulting people"]'::jsonb
    ])[1 + (abs(hashtext(id::text)) % 8)] AS looking_for
  FROM public.attendees
  WHERE interests = '[]'::jsonb OR interests IS NULL
) v
WHERE a.id = v.id;

-- Varied discovery visibility for demo privacy mix (~12% hidden, ~18% anonymous)
UPDATE public.attendees
SET discovery_visibility = CASE (abs(hashtext(id::text)) % 20)
  WHEN 0 THEN 'hidden'
  WHEN 1 THEN 'hidden'
  WHEN 2 THEN 'anonymous'
  WHEN 3 THEN 'anonymous'
  ELSE discovery_visibility
END
WHERE discovery_visibility = 'visible'
  AND abs(hashtext(id::text || 'vis')) % 5 = 0;

-- Sponsor open: ~80% open
UPDATE public.attendees
SET sponsor_open = (abs(hashtext(id::text || 'spo')) % 5) <> 0
WHERE sponsor_open IS TRUE
  AND abs(hashtext(id::text || 'spo2')) % 10 = 0;
