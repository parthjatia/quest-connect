import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Sparkles, ArrowLeft, Wand2, Lock, Unlock, FileText, Check, X as XIcon, Clock, Radio, LogOut, Upload } from "lucide-react";
import { getRegistrationOpen, setRegistrationOpen } from "@/lib/event-settings";
import { runLlmMatchmaker } from "@/lib/matchmaker.functions";
import { getLocalAdmin, setLocalAdmin } from "@/lib/local-attendee";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Quest Connect" }] }),
  component: AdminPage,
});

type Quest = {
  id: string; title: string; description: string; type: string;
  points_awarded: number; emoji: string | null;
  start_at: string | null; end_at: string | null; is_live: boolean;
  transcript_url: string | null;
  approval_status?: "pending" | "approved" | "rejected";
  created_by_sponsor?: string | null;
};
type Attendee = {
  id: string;
  full_name: string | null;
  university: string | null;
  academic_background: string | null;
  ai_experience: string | null;
  track_intent: string | null;
  event_goal: string | null;
  points: number;
  group_id: string | null;
  late: boolean;
  verify_code: string | null;
};
type Group = { id: string; group_name: string };

function AdminPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Admin guard
  useEffect(() => {
    if (!getLocalAdmin()) navigate({ to: "/auth", search: { mode: "admin" } });
  }, [navigate]);

  const quests = useQuery({
    queryKey: ["admin-quests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("id, title, description, type, points_awarded, emoji, start_at, end_at, is_live, transcript_url, approval_status, created_by_sponsor")
        .order("type")
        .order("start_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Quest[];
    },
  });

  const attendees = useQuery({
    queryKey: ["admin-attendees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendees")
        .select("id, full_name, university, academic_background, ai_experience, track_intent, event_goal, points, group_id, late, verify_code")
        .order("points", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Attendee[];
    },
  });

  const settings = useQuery({
    queryKey: ["event-settings"],
    queryFn: getRegistrationOpen,
  });

  const groups = useQuery({
    queryKey: ["admin-groups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("id, group_name");
      if (error) throw error;
      return (data ?? []) as Group[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendees" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-attendees"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "groups" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-groups"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "quests" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-quests"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const [togglingReg, setTogglingReg] = useState(false);
  const toggleRegistration = async () => {
    setTogglingReg(true);
    try {
      await setRegistrationOpen(!(settings.data ?? true));
      toast.success(settings.data ? "Registration closed" : "Registration opened");
      qc.invalidateQueries({ queryKey: ["event-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setTogglingReg(false); }
  };

  const [matching, setMatching] = useState(false);
  const matchmakerFn = useServerFn(runLlmMatchmaker);
  const runMatchmaker = async () => {
    const eligible = (attendees.data ?? []).filter((a) => !a.late);
    if (eligible.length < 3) return toast.error("Need at least 3 non-late attendees.");
    if (!confirm(`Run AI matchmaker on ${eligible.length} attendees? This clears existing pods.`)) return;
    setMatching(true);
    try {
      const result = await matchmakerFn();
      if (result.method === "ai") {
        toast.success(`AI formed ${result.pods_created} pods`);
      } else {
        toast.warning(`Used heuristic fallback (${result.pods_created} pods)${result.error ? ` — ${result.error}` : ""}`);
      }
      qc.invalidateQueries({ queryKey: ["admin-attendees"] });
      qc.invalidateQueries({ queryKey: ["admin-groups"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Matchmaker failed");
    } finally { setMatching(false); }
  };

  const signOut = () => { setLocalAdmin(false); navigate({ to: "/" }); };

  const [clearing, setClearing] = useState(false);
  const clearAllAttendees = async () => {
    if (!confirm("Delete ALL attendees, pods, verifications, completions and submissions? This cannot be undone.")) return;
    if (!confirm("Really delete EVERYTHING attendee-related? Last chance.")) return;
    setClearing(true);
    try {
      await supabase.from("pod_verifications").delete().not("id", "is", null);
      await supabase.from("completed_quests").delete().not("id", "is", null);
      await supabase.from("group_quest_submissions").delete().not("id", "is", null);
      await supabase.from("attendees").delete().not("id", "is", null);
      await supabase.from("groups").delete().not("id", "is", null);
      toast.success("All attendees cleared");
      qc.invalidateQueries({ queryKey: ["admin-attendees"] });
      qc.invalidateQueries({ queryKey: ["admin-groups"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-submissions"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to clear");
    } finally { setClearing(false); }
  };

  const totalPoints = (quests.data ?? []).reduce((s, q) => s + (q.points_awarded ?? 0), 0);
  const podCount = groups.data?.length ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
            <span className="font-semibold tracking-tight">Quest Connect</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-lime border border-lime px-1.5 py-0.5">Admin</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4 mr-1" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* Stats strip */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border">
          <Stat label="Attendees" value={attendees.data?.length ?? 0} />
          <Stat label="Total points" value={totalPoints} />
          <Stat label="Quests" value={quests.data?.length ?? 0} />
          <Stat label="Pods" value={podCount} accent />
        </section>

        {/* Registration + matchmaker */}
        <section className="grid sm:grid-cols-2 gap-px bg-border border border-border">
          <div className="bg-background p-5 flex flex-col gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Registration</p>
              <p className="text-sm mt-2">
                {settings.data === false ? (
                  <span className="text-muted-foreground">Closed — new signups marked as late.</span>
                ) : (
                  <span className="text-lime">Open — new attendees can join.</span>
                )}
              </p>
            </div>
            <Button onClick={toggleRegistration} disabled={togglingReg || settings.isLoading}
              className={`self-start ${settings.data === false ? "bg-lime hover:opacity-90" : "bg-background border border-lime text-lime hover:bg-lime/10"}`}>
              {togglingReg ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> :
                settings.data === false ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              {settings.data === false ? "Re-open" : "Close registration"}
            </Button>
          </div>
          <div className="bg-background p-5 flex flex-col gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Matchmaker</p>
              <p className="text-sm mt-2 text-muted-foreground">Groups non-late attendees into pods of 3–5 with shared goals.</p>
            </div>
            <Button onClick={runMatchmaker} disabled={matching} className="bg-lime hover:opacity-90 self-start">
              {matching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
              {matching ? "Matching…" : "Form pods"}
            </Button>
          </div>
        </section>

        {/* Sponsor quest proposals */}
        <SponsorProposals quests={quests.data ?? []} />

        {/* Pending side-quest submissions */}
        <PendingSubmissionsQueue />


        {/* Pods — compact list */}
        {podCount > 0 && (
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg font-semibold tracking-tight">Pods</h2>
              <p className="text-xs text-muted-foreground">{podCount} pods · live</p>
            </div>
            <div className="border border-border max-h-[360px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-card sticky top-0">
                  <tr>
                    <th className="text-left p-2">Pod</th>
                    <th className="text-left p-2 w-16">Size</th>
                    <th className="text-left p-2">Members (code)</th>
                  </tr>
                </thead>
                <tbody>
                  {(groups.data ?? []).map((g) => {
                    const members = (attendees.data ?? []).filter((a) => a.group_id === g.id);
                    return (
                      <tr key={g.id} className="border-t border-border align-top">
                        <td className="p-2 font-medium">{g.group_name}</td>
                        <td className="p-2 text-lime font-semibold">{members.length}</td>
                        <td className="p-2 text-muted-foreground text-xs">
                          {members.map((m) => (
                            <span key={m.id} className="inline-block mr-2">
                              {m.full_name || "Unnamed"}{" "}
                              <span className="font-mono text-foreground/70">({m.verify_code ?? "—"})</span>
                            </span>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Attendee list */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-semibold tracking-tight">Attendees</h2>
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground">Sorted by points · live</p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllAttendees}
                disabled={clearing}
                className="h-7 text-xs border-destructive text-destructive hover:bg-destructive/10"
              >
                {clearing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
                Clear all
              </Button>
            </div>
          </div>
          {attendees.isLoading ? (
            <div className="border border-border p-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-lime" /></div>
          ) : (attendees.data ?? []).length === 0 ? (
            <div className="border border-border p-10 text-center text-sm text-muted-foreground">
              No attendees yet. Have them sign up from the join page.
            </div>
          ) : (
            <div className="border border-border max-h-[480px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-card sticky top-0">
                  <tr>
                    <th className="text-left p-2 w-8">#</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2 hidden md:table-cell">University</th>
                    <th className="text-left p-2 hidden lg:table-cell">Track</th>
                    <th className="text-left p-2 hidden sm:table-cell">AI</th>
                    <th className="text-right p-2">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {(attendees.data ?? []).map((a, i) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      <td className="p-2 font-medium">{a.full_name || "Unnamed"}</td>
                      <td className="p-2 text-muted-foreground hidden md:table-cell truncate max-w-[200px]">{a.university ?? "—"}</td>
                      <td className="p-2 text-muted-foreground hidden lg:table-cell truncate max-w-[180px]">{a.track_intent ?? "—"}</td>
                      <td className="p-2 text-muted-foreground hidden sm:table-cell">{a.ai_experience ?? "—"}</td>
                      <td className="p-2 text-right text-lime font-semibold">{a.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Quests */}
        <QuestManager quests={quests.data ?? []} loading={quests.isLoading} />
      </main>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="bg-background p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${accent ? "text-lime" : ""}`}>{value}</p>
    </div>
  );
}

function toLocalInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function QuestManager({ quests, loading }: { quests: Quest[]; loading: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("⭐");
  const [points, setPoints] = useState(10);
  const [type, setType] = useState<"main" | "side">("main");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setTitle(""); setDescription(""); setEmoji("⭐"); setPoints(10); setType("main");
    setStartAt(""); setEndAt("");
  };

  const add = async () => {
    if (!title.trim() || !description.trim()) return toast.error("Title and description required.");
    setBusy(true);
    try {
      const { error } = await supabase.from("quests").insert({
        title: title.trim(), description: description.trim(), emoji, points_awarded: points, type,
        start_at: type === "main" && startAt ? new Date(startAt).toISOString() : null,
        end_at: type === "main" && endAt ? new Date(endAt).toISOString() : null,
      });
      if (error) throw error;
      toast.success("Quest added");
      reset(); setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-quests"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this quest?")) return;
    const { error } = await supabase.from("quests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-quests"] });
  };

  const goLive = async (id: string) => {
    // Atomic-ish: unset all main is_live, then set this one
    const { error: e1 } = await supabase.from("quests").update({ is_live: false }).eq("type", "main").eq("is_live", true);
    if (e1) return toast.error(e1.message);
    const { error: e2 } = await supabase.from("quests").update({ is_live: true }).eq("id", id);
    if (e2) return toast.error(e2.message);
    toast.success("Quest is now LIVE");
    qc.invalidateQueries({ queryKey: ["admin-quests"] });
  };

  const stopLive = async (id: string) => {
    const { error } = await supabase.from("quests").update({ is_live: false }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Stopped");
    qc.invalidateQueries({ queryKey: ["admin-quests"] });
  };

  const updateTimes = async (id: string, start: string, end: string) => {
    const { error } = await supabase.from("quests").update({
      start_at: start ? new Date(start).toISOString() : null,
      end_at: end ? new Date(end).toISOString() : null,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Times updated");
    qc.invalidateQueries({ queryKey: ["admin-quests"] });
  };

  const mainQuests = quests.filter((q) => q.type === "main");
  const sideQuests = quests.filter((q) => q.type === "side");

  return (
    <section className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Quests</h2>
        <Button onClick={() => setOpen(!open)} size="sm" className="bg-lime hover:opacity-90 h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" />{open ? "Cancel" : "New quest"}
        </Button>
      </div>

      {open && (
        <div className="border border-lime p-4 space-y-3">
          <div className="grid grid-cols-[60px_1fr] gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Emoji</label>
              <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} className="text-center text-xl bg-background border-border" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Opening keynote" className="bg-background border-border" />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="bg-background border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Points</label>
              <Input type="number" min={1} max={500} value={points} onChange={(e) => setPoints(parseInt(e.target.value) || 10)} className="bg-background border-border" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Type</label>
              <div className="flex gap-2 mt-1">
                <Button type="button" variant={type === "main" ? "default" : "outline"} size="sm" className={`flex-1 ${type === "main" ? "bg-lime hover:opacity-90" : ""}`} onClick={() => setType("main")}>Main (timeline)</Button>
                <Button type="button" variant={type === "side" ? "default" : "outline"} size="sm" className={`flex-1 ${type === "side" ? "bg-lime hover:opacity-90" : ""}`} onClick={() => setType("side")}>Side (group)</Button>
              </div>
            </div>
          </div>
          {type === "main" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Starts at</label>
                <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="bg-background border-border" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Ends at</label>
                <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="bg-background border-border" />
              </div>
            </div>
          )}
          <Button onClick={add} disabled={busy} className="w-full bg-lime hover:opacity-90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Create quest
          </Button>
        </div>
      )}

      {/* Main quest timeline editor */}
      <div>
        <h3 className="text-sm font-semibold tracking-tight mb-2">Main quests — event timeline</h3>
        {loading ? (
          <div className="border border-border p-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-lime" /></div>
        ) : mainQuests.length === 0 ? (
          <div className="border border-border p-8 text-center text-sm text-muted-foreground">No main quests yet.</div>
        ) : (
          <ol className="relative border-l border-border ml-3 space-y-3">
            {mainQuests.map((q) => (
              <li key={q.id} className="ml-6 relative">
                <span className={`absolute -left-[34px] top-3 h-3 w-3 rounded-full border-2 ${q.is_live ? "bg-lime border-lime animate-pulse" : "bg-background border-border"}`} />
                <div className={`border p-3 ${q.is_live ? "border-lime" : "border-border"}`}>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg" aria-hidden>{q.emoji ?? "⭐"}</span>
                        <p className="font-medium text-sm">{q.title}</p>
                        {q.is_live && (
                          <span className="text-[10px] uppercase tracking-wider text-lime border border-lime px-1.5 py-0.5 inline-flex items-center gap-1">
                            <Radio className="h-3 w-3" /> LIVE NOW
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{q.description}</p>
                    </div>
                    <span className="text-xs font-semibold text-lime shrink-0">+{q.points_awarded}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Start</label>
                      <Input type="datetime-local" defaultValue={toLocalInputValue(q.start_at)}
                        onBlur={(e) => updateTimes(q.id, e.target.value, toLocalInputValue(q.end_at))}
                        className="bg-background border-border h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">End</label>
                      <Input type="datetime-local" defaultValue={toLocalInputValue(q.end_at)}
                        onBlur={(e) => updateTimes(q.id, toLocalInputValue(q.start_at), e.target.value)}
                        className="bg-background border-border h-8 text-xs" />
                    </div>
                  </div>
                  <AdminQuestTranscriptUpload
                    questId={q.id}
                    existingUrl={q.transcript_url}
                    onDone={() => qc.invalidateQueries({ queryKey: ["admin-quests"] })}
                  />
                  <div className="flex gap-2 mt-3">
                    {q.is_live ? (
                      <Button size="sm" onClick={() => stopLive(q.id)} variant="outline" className="h-7 text-xs border-destructive text-destructive hover:bg-destructive/10">
                        Stop live
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => goLive(q.id)} className="h-7 text-xs bg-lime hover:opacity-90">
                        <Radio className="h-3 w-3 mr-1" /> Go live
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => del(q.id)} className="h-7 px-2 ml-auto">
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Side quests */}
      <div>
        <h3 className="text-sm font-semibold tracking-tight mb-2">Side quests — group challenges</h3>
        {sideQuests.length === 0 ? (
          <div className="border border-border p-8 text-center text-sm text-muted-foreground">No side quests yet.</div>
        ) : (
          <div className="grid gap-px bg-border border border-border sm:grid-cols-2 lg:grid-cols-3">
            {sideQuests.map((q) => (
              <div key={q.id} className="bg-background p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg" aria-hidden>{q.emoji ?? "⭐"}</span>
                    <h3 className="font-medium text-sm truncate">{q.title}</h3>
                  </div>
                  {q.created_by_sponsor ? (
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-lime text-lime shrink-0">
                      sponsor · {q.created_by_sponsor}
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-border text-muted-foreground">side</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{q.description}</p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-xs font-semibold text-lime">+{q.points_awarded} pts</span>
                  <Button variant="ghost" size="sm" onClick={() => del(q.id)} className="h-7 px-2">
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AdminQuestTranscriptUpload({
  questId,
  existingUrl,
  onDone,
}: {
  questId: string;
  existingUrl: string | null;
  onDone: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5 MB.");
    setBusy(true);
    try {
      const path = `admin/quests/${questId}-${Date.now()}.md`;
      const up = await supabase.storage.from("quest-transcripts").upload(path, file, {
        contentType: "text/markdown",
        upsert: true,
      });
      if (up.error) throw up.error;
      const { data: pub } = supabase.storage.from("quest-transcripts").getPublicUrl(path);
      const { error } = await supabase.from("quests").update({ transcript_url: pub.publicUrl }).eq("id", questId);
      if (error) throw error;
      toast.success("Event transcript uploaded");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground w-full">
        Conversation transcript (.md) — attendees use this for visual recap
      </p>
      {existingUrl && (
        <a
          href={existingUrl}
          target="_blank"
          rel="noreferrer"
          className="h-7 px-3 border border-border text-[10px] uppercase tracking-wider text-muted-foreground hover:text-lime hover:border-lime inline-flex items-center gap-1"
        >
          <FileText className="h-3 w-3" /> View transcript
        </a>
      )}
      <input
        ref={ref}
        type="file"
        accept=".md,text/markdown"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => ref.current?.click()}
        className="h-7 text-xs border-dashed border-border hover:border-lime hover:text-lime"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
        {existingUrl ? "Replace .md" : "Upload .md"}
      </Button>
    </div>
  );
}

function TranscriptsPanel() {
  const transcripts = useQuery({
    queryKey: ["admin-transcripts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_transcripts")
        .select("id, transcript_url, uploaded_at, attendee_id, quest_id, attendees(full_name), quests(title, emoji)")
        .order("uploaded_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold tracking-tight">Quest transcripts</h2>
        <p className="text-xs text-muted-foreground">Markdown uploads from attendees</p>
      </div>
      {transcripts.isLoading ? (
        <div className="border border-border p-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-lime" /></div>
      ) : (transcripts.data ?? []).length === 0 ? (
        <div className="border border-border p-8 text-center text-sm text-muted-foreground">
          No transcripts uploaded yet.
        </div>
      ) : (
        <div className="border border-border divide-y divide-border">
          {(transcripts.data ?? []).map((t: any) => (
            <div key={t.id} className="p-3 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate">
                  <span className="text-lime mr-2">{t.quests?.emoji ?? "📄"}</span>
                  <span className="font-medium">{t.quests?.title ?? "Quest"}</span>
                  <span className="text-muted-foreground ml-2">— {t.attendees?.full_name ?? "Unknown"}</span>
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                  {new Date(t.uploaded_at).toLocaleString()}
                </p>
              </div>
              <a href={t.transcript_url} target="_blank" rel="noreferrer"
                className="text-xs text-lime inline-flex items-center gap-1 shrink-0">
                <FileText className="h-3 w-3" /> Open .md
              </a>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PendingSubmissionsQueue() {
  const qc = useQueryClient();
  const subs = useQuery({
    queryKey: ["admin-pending-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_quest_submissions")
        .select("id, status, photo_url, created_at, reviewer_note, group_id, quest_id, groups(group_name), quests(title, emoji, points_awarded)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin-subs")
      .on("postgres_changes", { event: "*", schema: "public", table: "group_quest_submissions" },
        () => qc.invalidateQueries({ queryKey: ["admin-pending-submissions"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const act = async (id: string, approve: boolean) => {
    const note = approve ? undefined : (prompt("Reason for rejection (optional)") || undefined);
    const params: { _submission_id: string; _note?: string } = { _submission_id: id };
    if (note) params._note = note;
    const fn = approve ? "approve_group_submission" : "reject_group_submission";
    const { error } = await supabase.rpc(fn, params);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Approved — points awarded to pod" : "Rejected");
    qc.invalidateQueries({ queryKey: ["admin-pending-submissions"] });
    qc.invalidateQueries({ queryKey: ["admin-attendees"] });
  };

  const rows = subs.data ?? [];
  const pending = rows.filter((r: any) => r.status === "pending");

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold tracking-tight">Side-quest submissions</h2>
        <p className="text-xs text-muted-foreground">{pending.length} awaiting review</p>
      </div>
      {rows.length === 0 ? (
        <div className="border border-border p-8 text-center text-sm text-muted-foreground">No submissions yet.</div>
      ) : (
        <div className="grid gap-px bg-border border border-border sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r: any) => (
            <div key={r.id} className="bg-background p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">{r.quests?.emoji} {r.quests?.title}</p>
                <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 border ${
                  r.status === "pending" ? "border-yellow-500/50 text-yellow-400" :
                  r.status === "approved" ? "border-lime text-lime" : "border-destructive text-destructive"
                }`}>{r.status}</span>
              </div>
              <p className="text-xs text-muted-foreground">{r.groups?.group_name} · +{r.quests?.points_awarded} each</p>
              {r.photo_url && <img src={r.photo_url} alt="" className="h-32 w-full object-cover border border-border" />}
              {r.status === "pending" && (
                <div className="flex gap-2 mt-1">
                  <Button size="sm" onClick={() => act(r.id, true)} className="flex-1 h-7 text-xs bg-lime hover:opacity-90">
                    <Check className="h-3 w-3 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => act(r.id, false)} className="flex-1 h-7 text-xs border-destructive text-destructive hover:bg-destructive/10">
                    <XIcon className="h-3 w-3 mr-1" /> Reject
                  </Button>
                </div>
              )}
              {r.reviewer_note && <p className="text-[10px] text-muted-foreground italic">Note: {r.reviewer_note}</p>}
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {new Date(r.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SponsorProposals({ quests }: { quests: Quest[] }) {
  const qc = useQueryClient();
  const pending = quests.filter((q) => q.approval_status === "pending" && q.created_by_sponsor);

  const decide = async (id: string, approve: boolean) => {
    const status = approve ? "approved" : "rejected";
    const { error } = await supabase.from("quests").update({ approval_status: status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Approved — quest is live for attendees" : "Rejected");
    qc.invalidateQueries({ queryKey: ["admin-quests"] });
  };

  if (pending.length === 0) return null;

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold tracking-tight">Sponsor quest proposals</h2>
        <p className="text-xs text-muted-foreground">{pending.length} awaiting review</p>
      </div>
      <div className="grid gap-px bg-border border border-border sm:grid-cols-2 lg:grid-cols-3">
        {pending.map((q) => (
          <div key={q.id} className="bg-background p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold truncate">{q.emoji} {q.title}</p>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-yellow-500/50 text-yellow-400">
                pending
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              by {q.created_by_sponsor} · +{q.points_awarded} pts
            </p>
            <p className="text-xs text-muted-foreground line-clamp-4">{q.description}</p>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={() => decide(q.id, true)} className="flex-1 h-7 text-xs bg-lime hover:opacity-90">
                <Check className="h-3 w-3 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => decide(q.id, false)} className="flex-1 h-7 text-xs border-destructive text-destructive hover:bg-destructive/10">
                <XIcon className="h-3 w-3 mr-1" /> Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
