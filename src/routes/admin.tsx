import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Sparkles, ArrowLeft, UserPlus, Wand2, Lock, Unlock, FileText, Check, X as XIcon, Clock } from "lucide-react";
import { MOCK_ATTENDEES } from "@/lib/mock-attendees";
import { getRegistrationOpen, setRegistrationOpen } from "@/lib/event-settings";
import { runLlmMatchmaker } from "@/lib/matchmaker.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Quest Connect" }] }),
  component: AdminPage,
});

type Quest = { id: string; title: string; description: string; type: string; points_awarded: number; emoji: string | null };
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

  const quests = useQuery({
    queryKey: ["admin-quests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quests").select("*").order("type").order("points_awarded", { ascending: false });
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
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const aiLevelToEnum = (s: string): "beginner" | "intermediate" | "power_user" | null => {
    const t = (s || "").toLowerCase();
    if (t.includes("power")) return "power_user";
    if (t.includes("inter")) return "intermediate";
    if (t.includes("begin")) return "beginner";
    return null;
  };

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

  const [seeding, setSeeding] = useState(false);
  const seedMocks = async () => {
    if (!confirm(`Seed ${MOCK_ATTENDEES.length} mock attendees? Existing ones stay.`)) return;
    setSeeding(true);
    try {
      const existing = new Set((attendees.data ?? []).map((a) => (a.full_name ?? "").trim().toLowerCase()));
      const fresh = MOCK_ATTENDEES.filter((m) => !existing.has(m.name.trim().toLowerCase()));
      if (fresh.length === 0) { toast.info("All mock attendees already seeded."); return; }
      const rows = fresh.map((m) => ({
        full_name: m.name,
        university: m.university,
        academic_background: m.background,
        ai_experience: aiLevelToEnum(m.ai_level),
        track_intent: m.track,
        event_goal: m.goal,
        onboarded: true,
      }));
      // Insert in chunks to avoid payload limits
      const chunk = 25;
      for (let i = 0; i < rows.length; i += chunk) {
        const { error } = await supabase.from("attendees").insert(rows.slice(i, i + chunk));
        if (error) throw error;
      }
      toast.success(`Seeded ${rows.length} attendees`);
      qc.invalidateQueries({ queryKey: ["admin-attendees"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Seeding failed");
    } finally { setSeeding(false); }
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

  const totalPoints = (attendees.data ?? []).reduce((s, a) => s + a.points, 0);
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
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* Stats strip */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border">
          <Stat label="Attendees" value={attendees.data?.length ?? 0} />
          <Stat label="Total points" value={totalPoints} />
          <Stat label="Quests live" value={quests.data?.length ?? 0} />
          <Stat label="Pods" value={podCount} accent />
        </section>

        {/* Registration control */}
        <section className="border border-border p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Registration</p>
            <p className="text-sm mt-1">
              {settings.data === false ? (
                <span className="text-muted-foreground">Closed — new signups marked as late and excluded from pods.</span>
              ) : (
                <span className="text-lime">Open — new attendees can join and will be matched.</span>
              )}
            </p>
          </div>
          <Button onClick={toggleRegistration} disabled={togglingReg || settings.isLoading}
            className={settings.data === false ? "bg-lime hover:opacity-90" : "bg-background border border-lime text-lime hover:bg-lime/10"}>
            {togglingReg ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> :
              settings.data === false ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
            {settings.data === false ? "Re-open registration" : "Close registration"}
          </Button>
        </section>

        {/* Seed + matchmaker actions */}
        <section className="grid sm:grid-cols-2 gap-px bg-border border border-border">
          <ActionBlock
            label="Seed mock attendees"
            blurb="Insert 100 hackathon attendees with university, background, AI level, track, and goal."
            cta={seeding ? "Seeding…" : "Seed roster"}
            icon={UserPlus}
            onClick={seedMocks}
            busy={seeding}
          />
          <ActionBlock
            label="Run matchmaker"
            blurb="Groups non-late attendees into pods of ~5, mixing AI levels & backgrounds within a shared track."
            cta={matching ? "Matching…" : "Form pods"}
            icon={Wand2}
            onClick={runMatchmaker}
            busy={matching}
          />
        </section>

        {/* Pending side-quest submissions */}
        <PendingSubmissionsQueue />

        {/* Transcripts panel */}
        <TranscriptsPanel />

        {/* Pods */}
        {podCount > 0 && (
          <section>
            <h2 className="text-lg font-semibold tracking-tight mb-3">Pods</h2>
            <div className="grid gap-px bg-border border border-border sm:grid-cols-2 lg:grid-cols-3">
              {(groups.data ?? []).map((g) => {
                const members = (attendees.data ?? []).filter((a) => a.group_id === g.id);
                return (
                  <div key={g.id} className="bg-background p-4">
                    <p className="text-sm font-semibold">{g.group_name}</p>
                    <ul className="mt-3 space-y-1">
                      {members.map((m) => (
                        <li key={m.id} className="text-xs flex items-center justify-between gap-2">
                          <span className="truncate">{m.full_name || "Unnamed"}</span>
                          <span className="text-muted-foreground shrink-0 font-mono">{(m as Attendee & { verify_code?: string }).verify_code ?? "—"}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        )}


        {/* Attendee list */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-semibold tracking-tight">Attendees</h2>
            <p className="text-xs text-muted-foreground">Sorted by points · live</p>
          </div>
          {attendees.isLoading ? (
            <div className="border border-border p-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-lime" /></div>
          ) : (attendees.data ?? []).length === 0 ? (
            <div className="border border-border p-10 text-center text-sm text-muted-foreground">
              No attendees yet. Hit "Seed roster" above.
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

function ActionBlock({
  label, blurb, cta, icon: Icon, onClick, busy,
}: { label: string; blurb: string; cta: string; icon: typeof UserPlus; onClick: () => void; busy: boolean }) {
  return (
    <div className="bg-background p-5 flex flex-col gap-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <p className="text-sm mt-2 text-muted-foreground">{blurb}</p>
      </div>
      <Button onClick={onClick} disabled={busy} className="bg-lime hover:opacity-90 self-start">
        {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Icon className="h-4 w-4 mr-2" />}
        {cta}
      </Button>
    </div>
  );
}

function QuestManager({ quests, loading }: { quests: Quest[]; loading: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("⭐");
  const [points, setPoints] = useState(10);
  const [type, setType] = useState<"main" | "side">("side");
  const [busy, setBusy] = useState(false);

  const reset = () => { setTitle(""); setDescription(""); setEmoji("⭐"); setPoints(10); setType("side"); };

  const add = async () => {
    if (!title.trim() || !description.trim()) return toast.error("Title and description required.");
    setBusy(true);
    try {
      const { error } = await supabase.from("quests").insert({
        title: title.trim(), description: description.trim(), emoji, points_awarded: points, type,
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

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold tracking-tight">Quests</h2>
        <Button onClick={() => setOpen(!open)} size="sm" className="bg-lime hover:opacity-90 h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" />{open ? "Cancel" : "New quest"}
        </Button>
      </div>

      {open && (
        <div className="border border-lime p-4 mb-4 space-y-3">
          <div className="grid grid-cols-[60px_1fr] gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Emoji</label>
              <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} className="text-center text-xl bg-background border-border" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Meet 3 founders" className="bg-background border-border" />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What does the attendee need to do?" className="bg-background border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Points</label>
              <Input type="number" min={1} max={500} value={points} onChange={(e) => setPoints(parseInt(e.target.value) || 10)} className="bg-background border-border" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Type</label>
              <div className="flex gap-2 mt-1">
                <Button type="button" variant={type === "side" ? "default" : "outline"} size="sm" className={`flex-1 ${type === "side" ? "bg-lime hover:opacity-90" : ""}`} onClick={() => setType("side")}>Side</Button>
                <Button type="button" variant={type === "main" ? "default" : "outline"} size="sm" className={`flex-1 ${type === "main" ? "bg-lime hover:opacity-90" : ""}`} onClick={() => setType("main")}>Main</Button>
              </div>
            </div>
          </div>
          <Button onClick={add} disabled={busy} className="w-full bg-lime hover:opacity-90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Create quest
          </Button>
        </div>
      )}

      {loading ? (
        <div className="border border-border p-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-lime" /></div>
      ) : quests.length === 0 ? (
        <div className="border border-border p-10 text-center text-sm text-muted-foreground">No quests yet.</div>
      ) : (
        <div className="grid gap-px bg-border border border-border sm:grid-cols-2 lg:grid-cols-3">
          {quests.map((q) => (
            <div key={q.id} className="bg-background p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg" aria-hidden>{q.emoji ?? "⭐"}</span>
                  <h3 className="font-medium text-sm truncate">{q.title}</h3>
                </div>
                <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 border ${q.type === "main" ? "border-lime text-lime" : "border-border text-muted-foreground"}`}>{q.type}</span>
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
    </section>
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

