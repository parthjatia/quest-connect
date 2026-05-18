import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getLocalAttendee, setLocalAttendee } from "@/lib/local-attendee";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Search, UserPlus } from "lucide-react";

export const Route = createFileRoute("/join")({
  head: () => ({ meta: [{ title: "Join — Quest Connect" }] }),
  component: JoinPage,
});

type Row = {
  id: string;
  full_name: string | null;
  university: string | null;
  academic_background: string | null;
  ai_experience: string | null;
  track_intent: string | null;
};

function JoinPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (getLocalAttendee()) navigate({ to: "/play" });
  }, [navigate]);

  const roster = useQuery({
    queryKey: ["join-roster"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendees")
        .select("id, full_name, university, academic_background, ai_experience, track_intent")
        .order("full_name")
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const rows = roster.data ?? [];
    if (!q) return rows.slice(0, 30);
    return rows.filter((r) =>
      (r.full_name ?? "").toLowerCase().includes(q) ||
      (r.university ?? "").toLowerCase().includes(q) ||
      (r.track_intent ?? "").toLowerCase().includes(q)
    ).slice(0, 30);
  }, [filter, roster.data]);

  const pickExisting = (r: Row) => {
    setBusy(r.id);
    setLocalAttendee(r.id, r.full_name ?? "Guest");
    toast.success(`Welcome, ${r.full_name}`);
    navigate({ to: "/play" });
  };

  const createNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return toast.error("Name needs at least 2 characters.");
    setBusy("__new__");
    try {
      const { data, error } = await supabase
        .from("attendees")
        .insert({ full_name: trimmed, onboarded: true })
        .select("id")
        .single();
      if (error) throw error;
      setLocalAttendee(data.id, trimmed);
      toast.success(`Welcome, ${trimmed}`);
      navigate({ to: "/play" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join");
      setBusy(null);
    }
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

      <main className="mx-auto max-w-3xl px-6 py-12 space-y-10">
        <div>
          <p className="text-lime text-xs uppercase tracking-[0.2em] mb-3">Join</p>
          <h1 className="text-3xl font-semibold tracking-tight">Step into the event</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Pick yourself from the roster, or add a fresh name.
          </p>
        </div>

        {/* New name */}
        <form onSubmit={createNew} className="border border-border p-5 space-y-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">New attendee</p>
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={60}
              className="bg-background border-border"
            />
            <Button type="submit" disabled={busy === "__new__"} className="bg-lime hover:opacity-90 shrink-0">
              {busy === "__new__" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
              Join
            </Button>
          </div>
        </form>

        {/* Roster */}
        <div className="border border-border">
          <div className="border-b border-border p-3 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search roster by name, university, track…"
              className="bg-transparent text-sm flex-1 outline-none placeholder:text-muted-foreground"
            />
            <span className="text-xs text-muted-foreground">{roster.data?.length ?? 0} total</span>
          </div>

          {roster.isLoading ? (
            <div className="p-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-lime" /></div>
          ) : filtered.length === 0 ? (
            <p className="p-10 text-sm text-muted-foreground text-center">
              No roster yet. Ask the admin to "Seed mock attendees" — or just join with your name above.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => pickExisting(r)}
                    disabled={!!busy}
                    className="w-full text-left p-3 hover:bg-card transition-colors flex items-center justify-between gap-3 disabled:opacity-50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.full_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[r.university, r.academic_background].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">
                      {r.ai_experience && <span className="border border-border px-1.5 py-0.5">{r.ai_experience}</span>}
                      {r.track_intent && <span className="border border-border px-1.5 py-0.5">{r.track_intent}</span>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
