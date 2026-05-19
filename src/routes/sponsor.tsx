import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getLocalSponsor, clearLocalSponsor } from "@/lib/local-attendee";
import { toast } from "sonner";
import { ArrowLeft, LogOut, Loader2, Plus, Sparkles, Clock, Check, X as XIcon } from "lucide-react";

export const Route = createFileRoute("/sponsor")({
  head: () => ({ meta: [{ title: "Sponsor portal — Quest Connect" }] }),
  component: SponsorPortal,
});

type SponsorQuestRow = {
  id: string;
  title: string;
  description: string;
  emoji: string | null;
  points_awarded: number;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
};

function SponsorPortal() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [handle, setHandle] = useState<string | null>(null);

  useEffect(() => {
    const h = getLocalSponsor();
    if (!h) navigate({ to: "/auth", search: { mode: "sponsor" } });
    else setHandle(h);
  }, [navigate]);

  const myQuests = useQuery({
    queryKey: ["sponsor-quests", handle],
    enabled: !!handle,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("id, title, description, emoji, points_awarded, approval_status, created_at")
        .eq("created_by_sponsor", handle!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SponsorQuestRow[];
    },
  });

  useEffect(() => {
    if (!handle) return;
    const ch = supabase
      .channel(`sponsor-${handle}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "quests" }, () =>
        qc.invalidateQueries({ queryKey: ["sponsor-quests", handle] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [handle, qc]);

  const signOut = () => { clearLocalSponsor(); navigate({ to: "/" }); };

  if (!handle) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-3 flex items-center justify-between text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Quest Connect
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-lime border border-lime px-1.5 py-0.5">
              Sponsor · {handle}
            </span>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        <div>
          <p className="text-lime text-xs uppercase tracking-[0.2em] mb-3">Sponsor portal</p>
          <h1 className="text-3xl font-semibold tracking-tight">Propose a side quest</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Submit a side quest for attendees. An organizer reviews and approves it before it goes live.
          </p>
        </div>

        <ProposeQuestForm handle={handle} onSubmitted={() => qc.invalidateQueries({ queryKey: ["sponsor-quests", handle] })} />

        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-semibold tracking-tight">Your submissions</h2>
            <p className="text-xs text-muted-foreground">{myQuests.data?.length ?? 0} total</p>
          </div>
          {myQuests.isLoading ? (
            <div className="border border-border p-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-lime" /></div>
          ) : (myQuests.data ?? []).length === 0 ? (
            <div className="border border-border p-8 text-center text-sm text-muted-foreground">
              You haven&apos;t submitted any quests yet.
            </div>
          ) : (
            <ul className="grid gap-px bg-border border border-border sm:grid-cols-2">
              {(myQuests.data ?? []).map((q) => (
                <li key={q.id} className="bg-background p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{q.emoji} {q.title}</p>
                    <StatusBadge status={q.approval_status} />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3">{q.description}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {new Date(q.created_at).toLocaleString()} · +{q.points_awarded} pts
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const cls =
    status === "approved" ? "border-lime text-lime" :
    status === "rejected" ? "border-destructive text-destructive" :
    "border-yellow-500/50 text-yellow-400";
  const Icon = status === "approved" ? Check : status === "rejected" ? XIcon : Clock;
  return (
    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 border inline-flex items-center gap-1 ${cls}`}>
      <Icon className="h-3 w-3" /> {status}
    </span>
  );
}

function ProposeQuestForm({ handle, onSubmitted }: { handle: string; onSubmitted: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [points, setPoints] = useState(10);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return toast.error("Title and description required.");
    setBusy(true);
    try {
      const { error } = await supabase.from("quests").insert({
        title: title.trim(),
        description: description.trim(),
        emoji,
        points_awarded: points,
        type: "side",
        created_by_sponsor: handle,
        approval_status: "pending",
      });
      if (error) throw error;
      toast.success("Submitted for review");
      setTitle(""); setDescription(""); setEmoji("🎯"); setPoints(10);
      onSubmitted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="border border-lime/50 p-5 space-y-4 bg-card/40">
      <div className="grid grid-cols-[60px_1fr] gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Emoji</label>
          <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4}
            className="text-center text-xl bg-background border-border mt-1" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Visit our booth and grab a sticker"
            className="bg-background border-border mt-1" />
        </div>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Description</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
          placeholder="What should attendees do?" className="bg-background border-border mt-1" />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Points</label>
        <div className="flex gap-2 mt-1">
          {[5, 10, 15, 20].map((p) => (
            <button key={p} type="button" onClick={() => setPoints(p)}
              className={`px-3 py-1.5 text-xs border ${points === p ? "border-lime text-lime bg-lime/10" : "border-border text-muted-foreground"}`}>
              +{p}
            </button>
          ))}
        </div>
      </div>
      <Button type="submit" disabled={busy} className="w-full bg-lime hover:opacity-90">
        {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
        Submit for review
      </Button>
    </form>
  );
}
