import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getLocalAttendee } from "@/lib/local-attendee";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Quey" },
      { name: "description", content: "Your attendee profile." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const [attendeeId, setAttendeeId] = useState<string | null>(null);

  useEffect(() => {
    setAttendeeId(getLocalAttendee()?.id ?? null);
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["profile-attendee", attendeeId],
    enabled: !!attendeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendees")
        .select(
          "full_name, university, academic_background, ai_experience, track_intent, event_goal, country, age, linkedin_url, github_url, hobbies, avatar_url, verify_code, current_zone, interests, skills, looking_for",
        )
        .eq("id", attendeeId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-extrabold text-lg tracking-tight">Quey</Link>
          <Link
            to="/recap"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to recap
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight mb-1">Your profile</h1>
        <p className="text-sm text-muted-foreground mb-8">How you appear to others at the event.</p>

        {!attendeeId && (
          <div className="rounded-xl border border-border/60 bg-card/60 p-6 text-sm text-muted-foreground">
            You're not signed in as an attendee yet.{" "}
            <Link to="/join" className="text-lime hover:underline">Join the event</Link>.
          </div>
        )}

        {attendeeId && isLoading && (
          <p className="text-sm text-muted-foreground">Loading profile…</p>
        )}

        {error && (
          <p className="text-sm text-destructive">Could not load profile.</p>
        )}

        {data && (
          <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm p-6 space-y-6">
            <div className="flex items-start gap-5">
              {data.avatar_url ? (
                <img
                  src={data.avatar_url}
                  alt={data.full_name ?? "Profile photo"}
                  className="h-20 w-20 rounded-xl object-cover border border-border/60"
                />
              ) : (
                <div className="h-20 w-20 rounded-xl bg-secondary grid place-items-center text-2xl font-bold">
                  {(data.full_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold truncate">{data.full_name ?? "Unnamed"}</h2>
                {data.university && (
                  <p className="text-sm text-muted-foreground truncate">{data.university}</p>
                )}
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70 mt-2">
                  Code · {data.verify_code}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Academic background" value={data.academic_background} />
              <Field label="AI experience" value={data.ai_experience} />
              <Field label="Track intent" value={data.track_intent} />
              <Field label="Event goal" value={data.event_goal} />
              <Field label="Country" value={data.country} />
              <Field label="Age" value={data.age?.toString()} />
              <Field label="Current zone" value={data.current_zone} />
              <Field label="Looking for" value={data.looking_for} />
            </div>

            {data.hobbies?.length > 0 && (
              <TagRow label="Hobbies" tags={data.hobbies} />
            )}
            {data.interests && data.interests.length > 0 && (
              <TagRow label="Interests" tags={data.interests} />
            )}
            {data.skills && data.skills.length > 0 && (
              <TagRow label="Skills" tags={data.skills} />
            )}

            {(data.linkedin_url || data.github_url) && (
              <div className="flex flex-wrap gap-3 pt-2 border-t border-border/40">
                {data.linkedin_url && (
                  <a
                    href={data.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-lime hover:underline"
                  >
                    LinkedIn ↗
                  </a>
                )}
                {data.github_url && (
                  <a
                    href={data.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-lime hover:underline"
                  >
                    GitHub ↗
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function TagRow({ label, tags }: { label: string; tags: string[] }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="text-xs px-2.5 py-1 rounded-full border border-border/70 text-muted-foreground">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
