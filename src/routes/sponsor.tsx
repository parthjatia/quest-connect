import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getLocalSponsor, clearLocalSponsor } from "@/lib/local-attendee";
import { reviewSponsorCompletionFn } from "@/lib/sponsor.functions";
import { toast } from "sonner";
import { ArrowLeft, LogOut, Loader2, Sparkles, Clock, Check, X as XIcon, Radio, ExternalLink } from "lucide-react";
import { ThreeBackground } from "@/components/three-bg";

export const Route = createFileRoute("/sponsor")({
  head: () => ({ meta: [{ title: "Sponsor portal — Quey" }] }),
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
      .on("postgres_changes", { event: "*", schema: "public", table: "completed_quests" }, () =>
        qc.invalidateQueries({ queryKey: ["sponsor-pending", handle] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [handle, qc]);

  const signOut = () => { clearLocalSponsor(); navigate({ to: "/" }); };

  if (!handle) return null;

  return (
    <div className="relative min-h-screen bg-neon-base text-foreground overflow-hidden">
      <ThreeBackground variant="dodecahedron" accent="green" />
      <div className="relative z-10">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-3 flex items-center justify-between text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Quey
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-lime border border-lime px-1.5 py-0.5">
              Sponsor · {handle}
            </span>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link to="/sponsor-radar"><Radio className="h-4 w-4 mr-1" />Radar</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        <div className="rounded-3xl bg-swoosh-3 p-8 sm:p-10">
          <p className="wrapped-kicker text-white/90 mb-4">Sponsor portal</p>
          <h1 className="wrapped-headline-md text-white">Propose a side quest</h1>
          <p className="text-sm text-white/85 mt-3">
            Submit a side quest for attendees. An organizer reviews and approves it before it goes live.
          </p>
        </div>


        <Link to="/sponsor-radar" className="block border border-lime/50 bg-card/40 p-4 hover:bg-card/60 transition">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-lime mb-1">Live insights</p>
              <p className="text-sm font-semibold">Open Sponsor Radar</p>
              <p className="text-xs text-muted-foreground mt-1">See attendees most aligned with your booth in real time.</p>
            </div>
            <Radio className="h-5 w-5 text-lime shrink-0" />
          </div>
        </Link>

        <ProposeQuestForm handle={handle} onSubmitted={() => qc.invalidateQueries({ queryKey: ["sponsor-quests", handle] })} />

        <PendingVerifications handle={handle} />


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

type PendingRow = {
  id: string;
  proof_link: string | null;
  claimed_at: string;
  quest: { id: string; title: string; emoji: string | null; points_awarded: number } | null;
  attendee: { id: string; full_name: string | null; university: string | null } | null;
};

function PendingVerifications({ handle }: { handle: string }) {
  const qc = useQueryClient();
  const reviewFn = useServerFn(reviewSponsorCompletionFn);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const pending = useQuery({
    queryKey: ["sponsor-pending", handle],
    queryFn: async () => {
      // 1) all quests owned by this sponsor
      const { data: qs, error: qErr } = await supabase
        .from("quests")
        .select("id, title, emoji, points_awarded")
        .eq("created_by_sponsor", handle);
      if (qErr) throw qErr;
      const qIds = (qs ?? []).map((q) => q.id);
      if (qIds.length === 0) return [] as PendingRow[];

      // 2) pending completions for those quests
      const { data: cqs, error: cErr } = await supabase
        .from("completed_quests")
        .select("id, quest_id, attendee_id, proof_link, claimed_at, verification_status")
        .in("quest_id", qIds)
        .eq("verification_status", "pending")
        .order("claimed_at", { ascending: true });
      if (cErr) throw cErr;
      const rows = cqs ?? [];
      if (rows.length === 0) return [] as PendingRow[];

      // 3) attendees
      const aIds = Array.from(new Set(rows.map((r) => r.attendee_id)));
      const { data: as } = await supabase
        .from("attendees")
        .select("id, full_name, university")
        .in("id", aIds);
      const qById = new Map((qs ?? []).map((q) => [q.id, q]));
      const aById = new Map((as ?? []).map((a) => [a.id, a]));
      return rows.map((r) => ({
        id: r.id,
        proof_link: r.proof_link,
        claimed_at: r.claimed_at,
        quest: qById.get(r.quest_id) ?? null,
        attendee: aById.get(r.attendee_id) ?? null,
      })) as PendingRow[];
    },
  });

  const decide = async (id: string, approve: boolean, noteText?: string) => {
    setBusy(id);
    try {
      await reviewFn({ data: { completed_id: id, sponsor_handle: handle, approve, note: noteText } });
      toast.success(approve ? "Approved — points awarded" : "Rejected");
      setRejectingId(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["sponsor-pending", handle] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(null); }
  };

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold tracking-tight">Pending verifications</h2>
        <p className="text-xs text-muted-foreground">{pending.data?.length ?? 0} waiting</p>
      </div>
      {pending.isLoading ? (
        <div className="border border-border p-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-lime" /></div>
      ) : (pending.data ?? []).length === 0 ? (
        <div className="border border-border p-8 text-center text-sm text-muted-foreground">No submissions waiting for review.</div>
      ) : (
        <ul className="grid gap-px bg-border border border-border">
          {(pending.data ?? []).map((row) => (
            <li key={row.id} className="bg-background p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {row.quest?.emoji} {row.quest?.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.attendee?.full_name ?? "Unknown attendee"}
                    {row.attendee?.university ? ` · ${row.attendee.university}` : ""}
                    {" · "}+{row.quest?.points_awarded ?? 0} pts
                  </p>
                </div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                  {new Date(row.claimed_at).toLocaleString()}
                </p>
              </div>
              {row.proof_link && (
                <a href={row.proof_link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-lime underline break-all">
                  <ExternalLink className="h-3 w-3" /> {row.proof_link}
                </a>
              )}
              {rejectingId === row.id ? (
                <div className="space-y-2">
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                    placeholder="Reason (optional, shown to attendee)" className="bg-background border-border text-xs" />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setNote(""); }}>Cancel</Button>
                    <Button size="sm" variant="destructive" disabled={busy === row.id}
                      onClick={() => decide(row.id, false, note.trim() || undefined)}>
                      {busy === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm reject"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 justify-end pt-1">
                  <Button size="sm" variant="outline" disabled={busy === row.id}
                    onClick={() => { setRejectingId(row.id); setNote(""); }}
                    className="border-destructive/50 text-destructive hover:bg-destructive/10">
                    <XIcon className="h-3 w-3 mr-1" /> Reject
                  </Button>
                  <Button size="sm" disabled={busy === row.id}
                    onClick={() => decide(row.id, true)}
                    className="bg-lime hover:opacity-90">
                    {busy === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3 mr-1" /> Approve</>}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
