import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getLocalAttendee, clearLocalAttendee } from "@/lib/local-attendee";
import { toast } from "sonner";
import { Loader2, Camera, LogOut, CheckCircle2, Lock, Upload, Eye, Sparkles, Pencil, Check, X, Clock, Users } from "lucide-react";
import { QuestSummaryModal } from "@/components/quest-summary-modal";
import { MainQuestRecapModal } from "@/components/recap/main-quest-recap-modal";
import { VibeMapSection } from "@/components/vibe-map/vibe-map-section";

export const Route = createFileRoute("/play")({
  head: () => ({ meta: [{ title: "Play — Quest Connect" }] }),
  component: PlayPage,
});

type Quest = {
  id: string; title: string; description: string; type: string;
  points_awarded: number; emoji: string | null; is_pod_gate: boolean;
  created_at: string;
  start_at: string | null; end_at: string | null; is_live: boolean;
  transcript_url: string | null;
};
type CompletedRow = { id: string; quest_id: string; quest_photo_url: string | null; claimed_at: string };
type Member = { id: string; full_name: string | null; university: string | null };
type Verification = { verifier_id: string; verified_id: string };
type Submission = { id: string; group_id: string; quest_id: string; photo_url: string; status: "pending" | "approved" | "rejected"; reviewer_note: string | null; created_at: string };

function PlayPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [attendee, setAttendee] = useState<{ id: string; name: string } | null>(null);
  const [summaryFor, setSummaryFor] = useState<Quest | null>(null);
  
  const [activeGroupSubmit, setActiveGroupSubmit] = useState<Quest | null>(null);

  useEffect(() => {
    const a = getLocalAttendee();
    if (!a) {
      navigate({ to: "/auth" });
      return;
    }
    setAttendee(a);
  }, [navigate]);

  const me = useQuery({
    queryKey: ["me", attendee?.id],
    enabled: !!attendee,
    queryFn: async () => {
      const { data, error } = await supabase.from("attendees").select("*").eq("id", attendee!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const pod = useQuery({
    queryKey: ["pod", me.data?.group_id],
    enabled: !!me.data?.group_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("id, group_name").eq("id", me.data!.group_id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const members = useQuery({
    queryKey: ["members", me.data?.group_id],
    enabled: !!me.data?.group_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendees")
        .select("id, full_name, university")
        .eq("group_id", me.data!.group_id!);
      if (error) throw error;
      return (data ?? []) as Member[];
    },
  });

  const verifications = useQuery({
    queryKey: ["verifications", me.data?.group_id],
    enabled: !!me.data?.group_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pod_verifications")
        .select("verifier_id, verified_id")
        .eq("group_id", me.data!.group_id!);
      if (error) throw error;
      return (data ?? []) as Verification[];
    },
  });

  const meets = useQuery({
    queryKey: ["meets", attendee?.id],
    enabled: !!attendee,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("attendee_meets")
        .select("met_attendee_id, created_at")
        .eq("attendee_id", attendee!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (rows ?? []).map((r) => r.met_attendee_id);
      if (ids.length === 0) return [] as Array<{ met_attendee_id: string; created_at: string; full_name: string | null; university: string | null }>;
      const { data: people } = await supabase.from("attendees").select("id, full_name, university").in("id", ids);
      const byId = new Map((people ?? []).map((p) => [p.id, p]));
      return (rows ?? []).map((r) => ({
        met_attendee_id: r.met_attendee_id,
        created_at: r.created_at,
        full_name: byId.get(r.met_attendee_id)?.full_name ?? null,
        university: byId.get(r.met_attendee_id)?.university ?? null,
      }));
    },
  });

  const quests = useQuery({
    queryKey: ["quests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quests").select("*").eq("approval_status", "approved").order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Quest[];
    },
  });

  const completed = useQuery({
    queryKey: ["completed", attendee?.id],
    enabled: !!attendee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("completed_quests")
        .select("id, quest_id, quest_photo_url, claimed_at")
        .eq("attendee_id", attendee!.id);
      if (error) throw error;
      return (data ?? []) as CompletedRow[];
    },
  });

  const submissions = useQuery({
    queryKey: ["submissions", me.data?.group_id],
    enabled: !!me.data?.group_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_quest_submissions")
        .select("id, group_id, quest_id, photo_url, status, reviewer_note, created_at")
        .eq("group_id", me.data!.group_id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Submission[];
    },
  });

  // Realtime
  useEffect(() => {
    if (!me.data?.group_id) return;
    const ch = supabase
      .channel(`pod-${me.data.group_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pod_verifications", filter: `group_id=eq.${me.data.group_id}` },
        () => qc.invalidateQueries({ queryKey: ["verifications"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "group_quest_submissions", filter: `group_id=eq.${me.data.group_id}` },
        () => { qc.invalidateQueries({ queryKey: ["submissions"] }); qc.invalidateQueries({ queryKey: ["completed"] }); qc.invalidateQueries({ queryKey: ["me"] }); })
      .on("postgres_changes", { event: "*", schema: "public", table: "groups", filter: `id=eq.${me.data.group_id}` },
        () => qc.invalidateQueries({ queryKey: ["pod"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me.data?.group_id, qc]);

  if (!attendee || me.isLoading) {
    return <div className="grid place-items-center min-h-screen"><Loader2 className="animate-spin h-6 w-6 text-lime" /></div>;
  }

  const completedMap = new Map((completed.data ?? []).map((c) => [c.quest_id, c]));
  const submissionByQuest = new Map((submissions.data ?? []).map((s) => [s.quest_id, s]));

  const allQuests = (quests.data ?? []).filter((q) => !q.is_pod_gate); // gate replaced by code verification
  const mainQuests = allQuests.filter((q) => q.type === "main");
  const sideQuests = allQuests.filter((q) => q.type === "side");

  // Transitive (undirected) connected component including me
  const verifList = verifications.data ?? [];
  const memberIds = (members.data ?? []).map((m) => m.id);
  const adj = new Map<string, Set<string>>();
  memberIds.forEach((id) => adj.set(id, new Set()));
  for (const v of verifList) {
    adj.get(v.verifier_id)?.add(v.verified_id);
    adj.get(v.verified_id)?.add(v.verifier_id);
  }
  const myComponent = new Set<string>([attendee.id]);
  const queue = [attendee.id];
  while (queue.length) {
    const n = queue.shift()!;
    for (const nb of adj.get(n) ?? []) if (!myComponent.has(nb)) { myComponent.add(nb); queue.push(nb); }
  }
  const iAmFullyVerified = memberIds.length > 0 && myComponent.size === memberIds.length;
  // Can submit side quests if my chain has ≥2 people (me + at least one verified peer)
  const canSubmitSideQuest = myComponent.size >= 2;

  const allCrossVerified = iAmFullyVerified; // pod considered active when everyone in one component
  const pendingSubmission = (submissions.data ?? []).some((s) => s.status === "pending");

  const groupState: "inactive" | "awaiting" | "active" | "none" =
    !pod.data ? "none"
      : !allCrossVerified ? "inactive"
      : pendingSubmission ? "awaiting" : "active";

  const leave = () => { clearLocalAttendee(); navigate({ to: "/" }); };

  const profileBits = [me.data?.university, me.data?.academic_background, me.data?.ai_experience, me.data?.track_intent].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between text-sm">
          <Link to="/" className="font-semibold tracking-tight">Quest Connect</Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={leave} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4 mr-1" />Leave
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-8">
        {/* Profile + verify code */}
        <section className="border border-border grid sm:grid-cols-[1fr_auto] divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Attendee</p>
            <h1 className="text-2xl font-semibold tracking-tight mt-1">{attendee.name}</h1>
            {profileBits.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {profileBits.map((b) => (
                  <span key={b} className="text-[10px] uppercase tracking-wider border border-border px-1.5 py-0.5 text-muted-foreground">{b}</span>
                ))}
              </div>
            )}
          </div>
          <div className="p-5 sm:w-64 bg-card/40">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Your code — share with your pod</p>
            <p className="font-mono text-3xl font-bold tracking-[0.3em] text-lime mt-2">{me.data?.verify_code ?? "----"}</p>
            <p className="text-[10px] text-muted-foreground mt-2">Pod members enter this to confirm they met you.</p>
          </div>
        </section>

        {/* Pod */}
        {!pod.data ? (
          <section className="border border-border p-5">
            <p className="text-sm text-muted-foreground">
              {me.data?.late ? "You joined after registration closed — no pod assigned." : "Waiting for the organizer to create pods…"}
            </p>
          </section>
        ) : (
          <PodPanel
            attendeeId={attendee.id}
            pod={pod.data}
            members={members.data ?? []}
            verifications={verifications.data ?? []}
            groupState={groupState}
            onRenamed={() => qc.invalidateQueries({ queryKey: ["pod"] })}
            onVerified={() => qc.invalidateQueries({ queryKey: ["verifications"] })}
          />
        )}

        <NetworkPanel
          attendeeId={attendee.id}
          podVerifiedCount={new Set((verifications.data ?? []).filter((v) => v.verifier_id === attendee.id).map((v) => v.verified_id)).size}
          meets={(meets.data ?? []) as Array<{ met_attendee_id: string; created_at: string; attendees: { full_name: string | null; university: string | null } | null }>}
          onMeet={() => {
            qc.invalidateQueries({ queryKey: ["meets"] });
            qc.invalidateQueries({ queryKey: ["me"] });
          }}
        />



        {/* Main quests timeline */}
        <MainQuestTimeline
          quests={mainQuests}
          completedMap={completedMap}
          onSummary={setSummaryFor}
        />

        {/* Side quests (group) */}
        <SideQuestsSection
          quests={sideQuests}
          submissionByQuest={submissionByQuest}
          locked={!iAmFullyVerified || !pod.data}
          lockedReason={!pod.data ? "Waiting for pod assignment" : "Verify every pod member's code to unlock"}
          onSubmit={(q) => setActiveGroupSubmit(q)}
          onSummary={setSummaryFor}
        />

        <VibeMapSection currentAttendeeId={attendee?.id ?? null} />
      </main>




      {activeGroupSubmit && pod.data && (
        <GroupSubmitDialog
          quest={activeGroupSubmit}
          groupId={pod.data.id}
          attendeeId={attendee.id}
          onClose={() => setActiveGroupSubmit(null)}
          onSubmitted={() => qc.invalidateQueries({ queryKey: ["submissions"] })}
        />
      )}

      {summaryFor && summaryFor.type === "main" && (
        <MainQuestRecapModal
          open
          onClose={() => setSummaryFor(null)}
          questTitle={summaryFor.title}
          questEmoji={summaryFor.emoji}
          points={summaryFor.points_awarded}
          transcriptUrl={summaryFor.transcript_url ?? null}
        />
      )}

      {summaryFor && summaryFor.type === "side" && (() => {
        const c = completedMap.get(summaryFor.id);
        return (
          <QuestSummaryModal
            open
            onClose={() => setSummaryFor(null)}
            questTitle={summaryFor.title}
            questEmoji={summaryFor.emoji}
            points={summaryFor.points_awarded}
            photoUrl={c?.quest_photo_url ?? null}
            claimedAt={c?.claimed_at ?? null}
          />
        );
      })()}
    </div>
  );
}

function PodPanel({
  attendeeId, pod, members, verifications, groupState, onRenamed, onVerified,
}: {
  attendeeId: string;
  pod: { id: string; group_name: string };
  members: Member[];
  verifications: Verification[];
  groupState: "inactive" | "awaiting" | "active" | "none";
  onRenamed: () => void;
  onVerified: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(pod.group_name);
  useEffect(() => { setName(pod.group_name); }, [pod.group_name]);
  const [codeInputs, setCodeInputs] = useState<Record<string, string>>({});
  const [busyFor, setBusyFor] = useState<string | null>(null);

  const others = members.filter((m) => m.id !== attendeeId);
  const verifiedByMe = new Set(verifications.filter((v) => v.verifier_id === attendeeId).map((v) => v.verified_id));

  const saveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { error } = await supabase.from("groups").update({ group_name: trimmed }).eq("id", pod.id);
    if (error) return toast.error(error.message);
    toast.success("Renamed");
    setEditingName(false);
    onRenamed();
  };

  const submitCode = async (memberId: string) => {
    const code = (codeInputs[memberId] ?? "").trim();
    if (code.length !== 4) return toast.error("Code is 4 characters");
    setBusyFor(memberId);
    try {
      const { error } = await supabase.rpc("verify_pod_member", { _verifier_id: attendeeId, _code: code });
      if (error) throw error;
      toast.success("Verified ✓");
      setCodeInputs((p) => ({ ...p, [memberId]: "" }));
      onVerified();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Wrong code");
    } finally { setBusyFor(null); }
  };

  const stateChip = {
    inactive: { label: "Inactive", cls: "border-border text-muted-foreground" },
    active:   { label: "Active",   cls: "border-lime text-lime" },
    awaiting: { label: "Awaiting review", cls: "border-yellow-500/50 text-yellow-400" },
    none:     { label: "—", cls: "border-border text-muted-foreground" },
  }[groupState];

  return (
    <section className="border border-border">
      <div className="p-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Users className="h-4 w-4 text-lime" />
          {editingName ? (
            <>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40}
                className="h-8 w-48 bg-background border-border" autoFocus />
              <Button size="sm" onClick={saveName} className="bg-lime hover:opacity-90 h-7"><Check className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditingName(false); setName(pod.group_name); }} className="h-7"><X className="h-3 w-3" /></Button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold tracking-tight">{pod.group_name}</h2>
              <button onClick={() => setEditingName(true)} className="text-muted-foreground hover:text-lime" aria-label="Rename pod">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
        <span className={`text-[10px] uppercase tracking-wider border px-2 py-0.5 ${stateChip.cls}`}>{stateChip.label}</span>
      </div>

      <div className="border-t border-border p-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Meet your pod — enter each member's code</p>
        {others.length === 0 ? (
          <p className="text-sm text-muted-foreground">You're flying solo in this pod.</p>
        ) : (
          <ul className="space-y-2">
            {others.map((m) => {
              const done = verifiedByMe.has(m.id);
              return (
                <li key={m.id} className="flex items-center justify-between gap-3 border border-border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.full_name ?? "Unnamed"}</p>
                    {m.university && <p className="text-[10px] text-muted-foreground truncate">{m.university}</p>}
                  </div>
                  {done ? (
                    <span className="text-[10px] uppercase tracking-wider text-lime inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        value={codeInputs[m.id] ?? ""}
                        onChange={(e) => setCodeInputs((p) => ({ ...p, [m.id]: e.target.value.toUpperCase() }))}
                        placeholder="A3F9" maxLength={4}
                        className="h-8 w-20 font-mono text-center bg-background border-border tracking-widest"
                      />
                      <Button size="sm" disabled={busyFor === m.id} onClick={() => submitCode(m.id)} className="h-8 bg-lime hover:opacity-90">
                        {busyFor === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Check"}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

/** Main-quest transcripts are uploaded by the organizer (quests.transcript_url), not attendees. */
function MainQuestTimeline({
  quests, completedMap, onSummary,
}: {
  quests: Quest[];
  completedMap: Map<string, CompletedRow>;
  onSummary: (q: Quest) => void;
}) {
  // Find current = first not completed; reorder: current first, then completed (most recent first)
  const currentIdx = quests.findIndex((q) => !completedMap.has(q.id));
  const current = currentIdx >= 0 ? quests[currentIdx] : null;
  const completedQuests = quests
    .filter((q) => completedMap.has(q.id))
    .sort((a, b) => (completedMap.get(b.id)?.claimed_at ?? "").localeCompare(completedMap.get(a.id)?.claimed_at ?? ""));
  const upcoming = quests.filter((q, i) => i > currentIdx && !completedMap.has(q.id));

  const ordered = [
    ...(current ? [{ q: current, kind: "current" as const }] : []),
    ...completedQuests.map((q) => ({ q, kind: "done" as const })),
    ...upcoming.map((q) => ({ q, kind: "upcoming" as const })),
  ];

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold tracking-tight">Main quests</h2>
        <p className="text-xs text-muted-foreground">Organizer uploads .md · you run visual recap</p>
      </div>
      {quests.length === 0 ? (
        <div className="border border-border p-8 text-center text-sm text-muted-foreground">No main quests yet.</div>
      ) : (
        <ol className="relative border-l border-border ml-3 space-y-4">
          {ordered.map(({ q, kind }) => {
            const done = completedMap.get(q.id);
            const dot = kind === "current" ? "bg-lime border-lime" : kind === "done" ? "bg-background border-lime" : "bg-background border-border";
            return (
              <li key={q.id} className="ml-6 relative">
                <span className={`absolute -left-[34px] top-2 h-3 w-3 rounded-full border-2 ${dot}`} />
                <div className={`border p-4 ${kind === "current" ? "border-lime" : "border-border"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg" aria-hidden>{q.emoji ?? "⭐"}</span>
                        <h3 className="font-medium">{q.title}</h3>
                        {kind === "current" && <span className="text-[10px] uppercase tracking-wider text-lime border border-lime px-1.5 py-0.5">Current</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{q.description}</p>
                    </div>
                    <span className="text-xs font-semibold text-lime shrink-0">+{q.points_awarded}</span>
                  </div>

                  {done?.quest_photo_url && (
                    <img src={done.quest_photo_url} alt="" className="mt-3 h-24 w-full object-cover border border-border" />
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {!done && kind === "upcoming" && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Locked — finish current first</span>
                    )}
                    {q.transcript_url ? (
                      <Button
                        size="sm"
                        disabled={!done}
                        onClick={() => onSummary(q)}
                        className={`h-7 text-xs ${done ? "bg-lime hover:opacity-90" : ""}`}
                        variant={done ? "default" : "outline"}
                      >
                        <Sparkles className="h-3 w-3 mr-1" /> Visual recap
                      </Button>
                    ) : (
                      done && (
                        <span className="text-[10px] text-muted-foreground">
                          Waiting for organizer to upload the conversation (.md)
                        </span>
                      )
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function SideQuestsSection({
  quests, submissionByQuest, locked, lockedReason, onSubmit, onSummary,
}: {
  quests: Quest[];
  submissionByQuest: Map<string, Submission>;
  locked: boolean;
  lockedReason: string;
  onSubmit: (q: Quest) => void;
  onSummary: (q: Quest) => void;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold tracking-tight">Side quests</h2>
        <p className={`text-xs ${locked ? "text-lime" : "text-muted-foreground"}`}>
          {locked ? lockedReason : "Group challenges · admin approves"}
        </p>
      </div>
      {quests.length === 0 ? (
        <div className="border border-border p-8 text-center text-sm text-muted-foreground">No side quests yet.</div>
      ) : (
        <div className={`relative grid gap-px bg-border border border-border sm:grid-cols-2 lg:grid-cols-3 ${locked ? "opacity-40 pointer-events-none" : ""}`}>
          {quests.map((q) => {
            const sub = submissionByQuest.get(q.id);
            return (
              <div key={q.id} className="bg-background p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg" aria-hidden>{q.emoji ?? "⭐"}</span>
                    <h3 className="font-medium text-sm truncate">{q.title}</h3>
                  </div>
                  <span className="text-xs font-semibold text-lime shrink-0">+{q.points_awarded}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{q.description}</p>
                {sub?.photo_url && <img src={sub.photo_url} alt="" className="h-20 w-full object-cover border border-border" />}
                <div className="mt-auto pt-2">
                  {!sub && (
                    <Button size="sm" onClick={() => onSubmit(q)} className="w-full bg-lime hover:opacity-90 h-7 text-xs">
                      <Upload className="h-3 w-3 mr-1" /> Submit for pod
                    </Button>
                  )}
                  {sub?.status === "pending" && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-yellow-400 border border-yellow-500/50 px-1.5 py-0.5">
                      <Clock className="h-3 w-3" /> Awaiting admin
                    </span>
                  )}
                  {sub?.status === "approved" && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-lime">
                        <CheckCircle2 className="h-3 w-3" /> Approved
                      </span>
                      <Button variant="outline" size="sm" onClick={() => onSummary(q)} className="h-6 text-xs border-border hover:border-lime hover:text-lime">
                        <Eye className="h-3 w-3 mr-1" /> Summary
                      </Button>
                    </div>
                  )}
                  {sub?.status === "rejected" && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-destructive">Rejected{sub.reviewer_note ? ` — ${sub.reviewer_note}` : ""}</span>
                      <Button size="sm" onClick={() => onSubmit(q)} className="w-full bg-lime hover:opacity-90 h-6 text-xs">Resubmit</Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {locked && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="bg-background border border-lime px-4 py-2 text-xs text-lime inline-flex items-center gap-2 pointer-events-auto">
                <Lock className="h-3 w-3" /> Locked
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}


function GroupSubmitDialog({
  quest, groupId, attendeeId, onClose, onSubmitted,
}: { quest: Quest; groupId: string; attendeeId: string; onClose: () => void; onSubmitted: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!file) return toast.error("Photo required.");
    if (file.size > 8 * 1024 * 1024) return toast.error("Max 8 MB.");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `groups/${groupId}/${quest.id}-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("quest-photos").upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { data: pub } = supabase.storage.from("quest-photos").getPublicUrl(path);
      const { error } = await supabase.from("group_quest_submissions").insert({
        group_id: groupId, quest_id: quest.id, photo_url: pub.publicUrl, submitted_by: attendeeId, status: "pending",
      });
      if (error) throw error;
      toast.success("Submitted — waiting for admin");
      onSubmitted();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{quest.emoji} {quest.title}</DialogTitle>
          <DialogDescription>Submit one photo on behalf of your pod. Admin will approve and award everyone.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); setPreview(f ? URL.createObjectURL(f) : null); }} />
          {preview ? (
            <img src={preview} alt="preview" className="w-full max-h-72 object-cover border border-border" />
          ) : (
            <button type="button" onClick={() => inputRef.current?.click()}
              className="w-full h-40 border border-dashed border-border grid place-items-center text-muted-foreground hover:border-lime hover:text-lime transition">
              <div className="text-center"><Camera className="h-6 w-6 mx-auto mb-2" /><p className="text-sm">Tap to upload pod photo</p></div>
            </button>
          )}
          {preview && <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>Change photo</Button>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={!file || busy} className="bg-lime hover:opacity-90">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit for review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
