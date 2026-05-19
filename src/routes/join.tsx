import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getLocalAttendee, setLocalAttendee } from "@/lib/local-attendee";
import { getRegistrationOpen } from "@/lib/event-settings";
import { TRACK_OPTIONS, GOAL_OPTIONS, type TrackIntent, type EventGoal } from "@/lib/attendee-options";
import { toast } from "sonner";
import { Loader2, ArrowLeft, UserPlus, Copy, CheckCircle2, Camera } from "lucide-react";

export const Route = createFileRoute("/join")({
  head: () => ({ meta: [{ title: "Join — Quest Connect" }] }),
  component: JoinPage,
});

const AI_LEVELS = [
  { value: null, label: "Never used" },
  { value: "beginner" as const, label: "Beginner" },
  { value: "intermediate" as const, label: "Intermediate" },
  { value: "power_user" as const, label: "Power user" },
];
type AILevel = "beginner" | "intermediate" | "power_user" | null;

function JoinPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [university, setUniversity] = useState("");
  const [background, setBackground] = useState("");
  const [aiLevel, setAiLevel] = useState<AILevel>("beginner");
  const [track, setTrack] = useState<TrackIntent | "">("");
  const [goal, setGoal] = useState<EventGoal | "">("");
  const [country, setCountry] = useState("");
  const [age, setAge] = useState<string>("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [hobbyDraft, setHobbyDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [welcome, setWelcome] = useState<{ id: string; name: string; code: string } | null>(null);

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Pick an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB");
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  };

  const addHobby = (raw: string) => {
    const v = raw.trim().replace(/,$/, "").trim();
    if (!v) return;
    if (v.length > 30) return toast.error("Hobby too long (max 30 chars)");
    if (hobbies.length >= 10) return toast.error("Max 10 hobbies");
    if (hobbies.some((h) => h.toLowerCase() === v.toLowerCase())) { setHobbyDraft(""); return; }
    setHobbies([...hobbies, v]);
    setHobbyDraft("");
  };
  const removeHobby = (h: string) => setHobbies(hobbies.filter((x) => x !== h));

  useEffect(() => {
    if (getLocalAttendee()) navigate({ to: "/play" });
  }, [navigate]);

  const settings = useQuery({
    queryKey: ["event-settings"],
    queryFn: getRegistrationOpen,
  });
  const isOpen = settings.data !== false;

  const validUrl = (u: string) => {
    if (!u.trim()) return true;
    try { new URL(u.trim()); return true; } catch { return false; }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Name required.");
    if (!university.trim() || !background.trim() || !track || !goal) {
      return toast.error("Please fill out all fields.");
    }
    if (!validUrl(linkedin)) return toast.error("LinkedIn must be a valid URL.");
    if (!validUrl(github)) return toast.error("GitHub must be a valid URL.");
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("attendees")
        .insert({
          full_name: name.trim(),
          university: university.trim(),
          academic_background: background.trim(),
          ai_experience: aiLevel,
          track_intent: track,
          event_goal: goal,
          country: country.trim() || null,
          age: age ? Number(age) : null,
          linkedin_url: linkedin.trim() || null,
          github_url: github.trim() || null,
          hobbies,
          avatar_url: avatarUrl,
          onboarded: true,
          late: !isOpen,
        })
        .select("id, verify_code")
        .single();
      if (error) throw error;
      setWelcome({ id: data.id, name: name.trim(), code: (data.verify_code ?? "").toUpperCase() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join");
    } finally { setBusy(false); }
  };

  const enterApp = () => {
    if (!welcome) return;
    setLocalAttendee(welcome.id, welcome.name);
    navigate({ to: "/play" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between text-sm">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> back
          </Link>
          <span className="text-muted-foreground">Quest Connect</span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-10 space-y-6">
        {welcome ? (
          <div className="space-y-6">
            <div className="rounded-3xl bg-swoosh-5 p-8 sm:p-10">
              <p className="wrapped-kicker text-white/90 mb-4">You're in</p>
              <h1 className="wrapped-headline-md text-white">Welcome, {welcome.name}</h1>
              <p className="text-sm text-white/85 mt-3">
                This is your <strong>login code</strong> AND the code your pod uses to verify they met you. Save it somewhere.
              </p>
            </div>

            <div className="border border-lime p-8 text-center bg-lime/5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Your code</p>
              <p className="font-mono text-6xl font-bold tracking-[0.4em] text-lime mt-3">{welcome.code}</p>
              <button
                onClick={() => { navigator.clipboard.writeText(welcome.code); toast.success("Copied"); }}
                className="mt-4 text-xs text-muted-foreground hover:text-lime inline-flex items-center gap-1"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <Button onClick={enterApp} className="w-full bg-lime hover:opacity-90">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Enter the event
            </Button>
          </div>
        ) : (
          <>
            <div className="rounded-3xl bg-swoosh-6 p-8 sm:p-10">
              <p className="wrapped-kicker text-white/90 mb-4">Sign up</p>
              <h1 className="wrapped-headline-md text-white">Join the event</h1>
              <p className="text-sm text-white/85 mt-3">
                Tell us about yourself so we can match you into the right pod.
              </p>
            </div>


            {!isOpen && (
              <div className="border border-lime/50 bg-lime/5 p-3 text-xs text-lime">
                Registration is closed. You can still join, but you won't be assigned to a pod.
              </div>
            )}

            <form onSubmit={submit} className="border border-border p-5 space-y-4">
              <Field label="Full name">
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
                  placeholder="Ada Lovelace" className="bg-background border-border" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Country">
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={80}
                    placeholder="India" className="bg-background border-border" />
                </Field>
                <Field label="Age">
                  <Input type="number" min={13} max={99} value={age} onChange={(e) => setAge(e.target.value)}
                    placeholder="22" className="bg-background border-border" />
                </Field>
              </div>
              <Field label="University">
                <Input value={university} onChange={(e) => setUniversity(e.target.value)} maxLength={120}
                  placeholder="e.g. IIT Bombay" className="bg-background border-border" />
              </Field>
              <Field label="Academic background">
                <Input value={background} onChange={(e) => setBackground(e.target.value)} maxLength={120}
                  placeholder="e.g. Computer Science, 3rd year" className="bg-background border-border" />
              </Field>
              <Field label="AI experience">
                <div className="grid grid-cols-2 gap-2">
                  {AI_LEVELS.map((lvl) => (
                    <button
                      key={lvl.label}
                      type="button"
                      onClick={() => setAiLevel(lvl.value)}
                      className={`text-xs uppercase tracking-wider px-3 py-2 border ${
                        aiLevel === lvl.value ? "border-lime text-lime" : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Intent of attending (track)">
                <div className="grid grid-cols-2 gap-2">
                  {TRACK_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTrack(opt.value)}
                      className={`text-xs uppercase tracking-wider px-3 py-2 border text-left ${
                        track === opt.value ? "border-lime text-lime" : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Goal of the event">
                <div className="grid grid-cols-2 gap-2">
                  {GOAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGoal(opt.value)}
                      className={`text-xs uppercase tracking-wider px-3 py-2 border text-left ${
                        goal === opt.value ? "border-lime text-lime" : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="LinkedIn URL (optional)">
                  <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} maxLength={200}
                    placeholder="https://linkedin.com/in/you" className="bg-background border-border" />
                </Field>
                <Field label="GitHub URL (optional)">
                  <Input value={github} onChange={(e) => setGithub(e.target.value)} maxLength={200}
                    placeholder="https://github.com/you" className="bg-background border-border" />
                </Field>
              </div>

              <Field label="Hobbies & special interests (optional)">
                <div className="space-y-2">
                  <Input
                    value={hobbyDraft}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v.endsWith(",")) addHobby(v);
                      else setHobbyDraft(v);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addHobby(hobbyDraft); }
                      else if (e.key === "Backspace" && !hobbyDraft && hobbies.length) {
                        removeHobby(hobbies[hobbies.length - 1]);
                      }
                    }}
                    onBlur={() => hobbyDraft && addHobby(hobbyDraft)}
                    maxLength={30}
                    placeholder="e.g. chess, climbing, sci-fi (Enter to add)"
                    className="bg-background border-border"
                  />
                  {hobbies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {hobbies.map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => removeHobby(h)}
                          className="text-[10px] uppercase tracking-wider border border-lime/50 text-lime px-2 py-1 hover:bg-lime/10"
                        >
                          {h} ×
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>

              <Button type="submit" disabled={busy} className="w-full bg-lime hover:opacity-90">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Sign up & get my code
              </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center">
              Already have a code?{" "}
              <Link to="/auth" className="text-lime hover:underline">
                Sign in with your code
              </Link>
              .
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
