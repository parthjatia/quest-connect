
-- Event settings: single-row table
CREATE TABLE public.event_settings (
  id boolean PRIMARY KEY DEFAULT true,
  registration_open boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = true)
);
INSERT INTO public.event_settings (id, registration_open) VALUES (true, true);

ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon read settings" ON public.event_settings FOR SELECT TO anon USING (true);
CREATE POLICY "anon update settings" ON public.event_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "authed read settings" ON public.event_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "authed update settings" ON public.event_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Late flag on attendees
ALTER TABLE public.attendees ADD COLUMN late boolean NOT NULL DEFAULT false;

-- Pod-gate flag on quests
ALTER TABLE public.quests ADD COLUMN is_pod_gate boolean NOT NULL DEFAULT false;

-- Seed the pod-gate quest
INSERT INTO public.quests (title, description, type, points_awarded, emoji, is_pod_gate)
VALUES (
  'Meet your pod',
  'Find your pod and take a selfie together. This unlocks all side quests.',
  'main', 25, '🤝', true
);

-- Transcripts table
CREATE TABLE public.quest_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id uuid NOT NULL,
  quest_id uuid NOT NULL,
  transcript_url text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quest_transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon read transcripts" ON public.quest_transcripts FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert transcripts" ON public.quest_transcripts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "authed read transcripts" ON public.quest_transcripts FOR SELECT TO authenticated USING (true);
CREATE POLICY "authed insert transcripts" ON public.quest_transcripts FOR INSERT TO authenticated WITH CHECK (true);

-- Storage bucket for markdown transcripts
INSERT INTO storage.buckets (id, name, public) VALUES ('quest-transcripts', 'quest-transcripts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "anon read transcript files" ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'quest-transcripts');
CREATE POLICY "anon upload transcript files" ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'quest-transcripts');
CREATE POLICY "authed read transcript files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'quest-transcripts');
CREATE POLICY "authed upload transcript files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'quest-transcripts');
