import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { setLocalAttendee, setLocalAdmin, setLocalSponsor } from "@/lib/local-attendee";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ThreeBackground } from "@/components/three-bg";

type AuthMode = "attendee" | "admin" | "sponsor";
type AuthSearch = { mode?: "admin" | "sponsor" };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    mode: search.mode === "admin" ? "admin" : search.mode === "sponsor" ? "sponsor" : undefined,
  }),
  head: () => ({ meta: [{ title: "Sign in — Quey" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { mode: rawMode } = Route.useSearch();
  const mode: AuthMode = rawMode ?? "attendee";

  return (
    <div className="relative min-h-screen bg-neon-base text-foreground overflow-hidden">
      <ThreeBackground variant="torus-knot" accent="magenta" />
      <header className="relative z-10 border-b border-[#ff2d87]/20">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between text-sm">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-neon-magenta transition-colors">
            <ArrowLeft className="h-4 w-4" /> back
          </Link>
          <span className="text-neon-magenta font-semibold tracking-[0.2em] uppercase text-xs">Quey</span>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-xl px-6 py-12 space-y-8">
        {mode === "admin" && (
          <>
            <div className="rounded-3xl bg-swoosh-2 p-8 sm:p-10">
              <p className="wrapped-kicker text-white/90 mb-4">Organizer</p>
              <h1 className="wrapped-headline-md text-white">Run the event</h1>
              <p className="text-sm text-white/80 mt-3">Enter the admin password to open the control panel.</p>
            </div>
            <AdminLogin navigate={navigate} />
          </>
        )}
        {mode === "sponsor" && (
          <>
            <div className="rounded-3xl bg-swoosh-3 p-8 sm:p-10">
              <p className="wrapped-kicker text-white/90 mb-4">Sponsor</p>
              <h1 className="wrapped-headline-md text-white">Sponsor portal</h1>
              <p className="text-sm text-white/85 mt-3">Enter your sponsor handle (e.g. <span className="font-mono">sponsor1</span>) to submit side quests.</p>
            </div>
            <SponsorLogin navigate={navigate} />
          </>
        )}
        {mode === "attendee" && (
          <>
            <div className="rounded-3xl bg-swoosh-5 p-8 sm:p-10">
              <p className="wrapped-kicker text-white/90 mb-4">Attendee</p>
              <h1 className="wrapped-headline-md text-white">Play the event</h1>
              <p className="text-sm text-white/85 mt-3">Sign in with your 4-character code from registration.</p>
            </div>
            <AttendeeLogin navigate={navigate} />
            <p className="text-xs text-muted-foreground text-center">
              Don&apos;t have a code yet?{" "}
              <Link to="/join" className="text-lime hover:underline">
                Sign up and get your code
              </Link>
              .
            </p>
          </>
        )}

        <ModeSwitcher mode={mode} />
      </main>
    </div>
  );
}

function ModeSwitcher({ mode }: { mode: AuthMode }) {
  return (
    <div className="text-xs text-muted-foreground text-center space-y-1">
      {mode !== "attendee" && (
        <p>
          Playing the event?{" "}
          <Link to="/auth" search={{}} className="text-lime hover:underline">Sign in as attendee</Link>
        </p>
      )}
      {mode !== "admin" && (
        <p>
          Running the event?{" "}
          <Link to="/auth" search={{ mode: "admin" }} className="text-lime hover:underline">Admin sign in</Link>
        </p>
      )}
      {mode !== "sponsor" && (
        <p>
          Are you a sponsor?{" "}
          <Link to="/auth" search={{ mode: "sponsor" }} className="text-lime hover:underline">Sponsor sign in</Link>
        </p>
      )}
    </div>
  );
}

function AttendeeLogin({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length !== 4) return toast.error("Code is 4 characters.");
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("attendees")
        .select("id, full_name")
        .eq("verify_code", clean)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast.error("No attendee found with that code.");
        return;
      }
      setLocalAttendee(data.id, data.full_name ?? "");
      toast.success(`Welcome back, ${data.full_name ?? "player"}`);
      navigate({ to: "/play" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="panel-neon-magenta p-5 space-y-4 rounded-md">
      <div>
        <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Your 4-character code</label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={4}
          placeholder="A3F9"
          className="mt-2 bg-background border-border font-mono text-center text-3xl tracking-[0.4em] h-16"
          autoFocus
        />
      </div>
      <Button type="submit" disabled={busy} className="w-full bg-lime hover:opacity-90">
        {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Sign in
      </Button>
    </form>
  );
}

function AdminLogin({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const [pw, setPw] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== "infoauraboys1!") return toast.error("Wrong password.");
    setLocalAdmin(true);
    toast.success("Admin unlocked");
    navigate({ to: "/admin" });
  };
  return (
    <form onSubmit={submit} className="panel-neon-magenta p-5 space-y-4 rounded-md">
      <div>
        <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Admin password</label>
        <Input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="mt-2 bg-background border-border"
          autoFocus
        />
      </div>
      <Button type="submit" className="w-full bg-lime hover:opacity-90">
        Enter admin
      </Button>
    </form>
  );
}

function SponsorLogin({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const [handle, setHandle] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = handle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (clean.length < 3) return toast.error("Handle must be at least 3 characters.");
    setLocalSponsor(clean);
    toast.success(`Welcome, ${clean}`);
    navigate({ to: "/sponsor" });
  };
  return (
    <form onSubmit={submit} className="panel-neon-magenta p-5 space-y-4 rounded-md">
      <div>
        <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Sponsor handle</label>
        <Input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="sponsor1"
          className="mt-2 bg-background border-border font-mono"
          autoFocus
        />
      </div>
      <Button type="submit" className="w-full bg-lime hover:opacity-90">
        Enter sponsor portal
      </Button>
    </form>
  );
}
