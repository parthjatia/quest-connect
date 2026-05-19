import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getLocalAttendee, setLocalAttendee } from "@/lib/local-attendee";
import { getRegistrationOpen } from "@/lib/event-settings";
import { toast } from "sonner";
import { Loader2, ArrowLeft, UserPlus, Copy, CheckCircle2 } from "lucide-react";

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
  const [track, setTrack] = useState("");
  const [goal, setGoal] = useState("");
  const [country, setCountry] = useState("");
  const [age, setAge] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [welcome, setWelcome] = useState<{ id: string; name: string; code: string } | null>(null);

  useEffect(() => {
    if (getLocalAttendee()) navigate({ to: "/play" });
  }, [navigate]);

  const settings = useQuery({
    queryKey: ["event-settings"],
    queryFn: getRegistrationOpen,
  });
  const isOpen = settings.data !== false;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Name required.");
    if (!university.trim() || !background.trim() || !track.trim() || !goal.trim()) {
      return toast.error("Please fill out all fields.");
    }
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("attendees")
        .insert({
          full_name: name.trim(),
          university: university.trim(),
          academic_background: background.trim(),
          ai_experience: aiLevel,
          track_intent: track.trim(),
          event_goal: goal.trim(),
          country: country.trim() || null,
          age: age ? Number(age) : null,
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
            <div>
              <p className="text-lime text-xs uppercase tracking-[0.2em] mb-3">You're in</p>
              <h1 className="text-3xl font-semibold tracking-tight">Welcome, {welcome.name}</h1>
              <p className="text-sm text-muted-foreground mt-2">
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
            <div>
              <p className="text-lime text-xs uppercase tracking-[0.2em] mb-3">Sign up</p>
              <h1 className="text-3xl font-semibold tracking-tight">Join the event</h1>
              <p className="text-sm text-muted-foreground mt-2">
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
              <Field label="Track intent">
                <Input value={track} onChange={(e) => setTrack(e.target.value)} maxLength={120}
                  placeholder="e.g. AI agents, dev tools, consumer apps" className="bg-background border-border" />
              </Field>
              <Field label="Event goal">
                <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={2} maxLength={300}
                  placeholder="What do you want to walk away with?" className="bg-background border-border" />
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
