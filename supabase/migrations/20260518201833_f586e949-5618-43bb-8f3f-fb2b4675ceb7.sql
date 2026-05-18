
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.ai_experience AS ENUM ('beginner', 'intermediate', 'power_user');
CREATE TYPE public.quest_type AS ENUM ('main', 'side');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Groups
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone authed read groups" ON public.groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage groups" ON public.groups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Attendees
CREATE TABLE public.attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name text,
  age int,
  country text,
  university text,
  academic_background text,
  ai_experience ai_experience,
  track_intent text,
  event_goal text,
  points int NOT NULL DEFAULT 0,
  group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  onboarded boolean NOT NULL DEFAULT false,
  wrapped_story text,
  wrapped_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authed read all attendees" ON public.attendees FOR SELECT TO authenticated USING (true);
CREATE POLICY "user update own attendee" ON public.attendees FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user insert own attendee" ON public.attendees FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins manage attendees" ON public.attendees FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Quests
CREATE TABLE public.quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  type quest_type NOT NULL DEFAULT 'side',
  points_awarded int NOT NULL DEFAULT 10,
  emoji text DEFAULT '⭐',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authed read quests" ON public.quests FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage quests" ON public.quests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Completed quests
CREATE TABLE public.completed_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id uuid REFERENCES public.attendees(id) ON DELETE CASCADE NOT NULL,
  quest_id uuid REFERENCES public.quests(id) ON DELETE CASCADE NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attendee_id, quest_id)
);
ALTER TABLE public.completed_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authed read completed" ON public.completed_quests FOR SELECT TO authenticated USING (true);
CREATE POLICY "user claim own" ON public.completed_quests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.attendees a WHERE a.id = attendee_id AND a.user_id = auth.uid()));

-- Atomic claim function: insert completed_quest + increment points
CREATE OR REPLACE FUNCTION public.claim_quest(_quest_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _attendee_id uuid;
  _points int;
  _new_total int;
BEGIN
  SELECT id INTO _attendee_id FROM public.attendees WHERE user_id = auth.uid();
  IF _attendee_id IS NULL THEN
    RAISE EXCEPTION 'attendee not found';
  END IF;
  SELECT points_awarded INTO _points FROM public.quests WHERE id = _quest_id;
  IF _points IS NULL THEN
    RAISE EXCEPTION 'quest not found';
  END IF;
  INSERT INTO public.completed_quests (attendee_id, quest_id) VALUES (_attendee_id, _quest_id);
  UPDATE public.attendees SET points = points + _points, updated_at = now()
    WHERE id = _attendee_id RETURNING points INTO _new_total;
  RETURN jsonb_build_object('points_awarded', _points, 'new_total', _new_total);
END $$;

-- Auto-create attendee row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.attendees (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed quests
INSERT INTO public.quests (title, description, type, points_awarded, emoji) VALUES
('Opening Keynote', 'Attend the opening keynote and check in', 'main', 50, '🎤'),
('Ship a Demo', 'Present your working product to a judge', 'main', 200, '🚀'),
('Pitch Practice', 'Do a 60-second pitch with a mentor', 'main', 75, '🎯'),
('Mentor Session', 'Book and complete a 1:1 mentor session', 'main', 60, '🧠'),
('Squad Selfie', 'Take a group selfie with your full squad', 'side', 30, '📸'),
('Coffee Connect', 'Get a coffee with someone from another squad', 'side', 25, '☕'),
('Cross-Track Chat', 'Have a 5-min chat with someone from a different track', 'side', 35, '🔀'),
('Whiteboard Wizard', 'Sketch your idea on a whiteboard with a teammate', 'side', 20, '🖊️'),
('Feedback Loop', 'Give constructive feedback to another team', 'side', 40, '💬'),
('Late-Night Hacker', 'Commit code after midnight', 'side', 25, '🌙'),
('First Bug Squashed', 'Fix your first bug of the event', 'side', 15, '🐛'),
('Sponsor Hello', 'Visit and chat with a sponsor booth', 'side', 20, '🤝');
