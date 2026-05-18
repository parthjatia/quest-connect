import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { setLocalAttendee, setLocalAdmin } from "@/lib/local-attendee";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Shield, User } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Quest Connect" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<"attendee" | "admin" | null>(null);

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

      <main className="mx-auto max-w-xl px-6 py-12 space-y-8">
        <div>
          <p className="text-lime text-xs uppercase tracking-[0.2em] mb-3">Sign in</p>
          <h1 className="text-3xl font-semibold tracking-tight">Who are you walking in as?</h1>
        </div>

        {!role && (
          <div className="grid sm:grid-cols-2 gap-px bg-border border border-border">
            <button onClick={() => setRole("attendee")} className="bg-background p-6 text-left hover:bg-card transition-colors">
              <User className="h-5 w-5 text-lime mb-3" />
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Attendee</p>
              <h2 className="text-lg font-semibold mt-1">I'm playing</h2>
              <p className="text-xs text-muted-foreground mt-2">Sign in with your 4-character code.</p>
            </button>
            <button onClick={() => setRole("admin")} className="bg-background p-6 text-left hover:bg-card transition-colors">
              <Shield className="h-5 w-5 text-lime mb-3" />
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
              <h2 className="text-lg font-semibold mt-1">I'm running it</h2>
              <p className="text-xs text-muted-foreground mt-2">Sign in with the admin password.</p>
            </button>
          </div>
        )}

        {role === "attendee" && <AttendeeLogin onBack={() => setRole(null)} navigate={navigate} />}
        {role === "admin" && <AdminLogin onBack={() => setRole(null)} navigate={navigate} />}

        <p className="text-xs text-muted-foreground text-center">
          Don't have a code yet? <Link to="/join" className="text-lime hover:underline">Sign up here</Link>.
        </p>
      </main>
    </div>
  );
}

function AttendeeLogin({ onBack, navigate }: { onBack: () => void; navigate: ReturnType<typeof useNavigate> }) {
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
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="border border-border p-5 space-y-4">
      <button type="button" onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> change role
      </button>
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
        Enter
      </Button>
    </form>
  );
}

function AdminLogin({ onBack, navigate }: { onBack: () => void; navigate: ReturnType<typeof useNavigate> }) {
  const [pw, setPw] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== "admin") return toast.error("Wrong password.");
    setLocalAdmin(true);
    toast.success("Admin unlocked");
    navigate({ to: "/admin" });
  };
  return (
    <form onSubmit={submit} className="border border-border p-5 space-y-4">
      <button type="button" onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> change role
      </button>
      <div>
        <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Admin password</label>
        <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="mt-2 bg-background border-border" autoFocus />
      </div>
      <Button type="submit" className="w-full bg-lime hover:opacity-90">Enter admin</Button>
    </form>
  );
}
