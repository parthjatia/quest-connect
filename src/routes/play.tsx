import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getLocalAttendee, clearLocalAttendee } from "@/lib/local-attendee";
import { toast } from "sonner";
import { Loader2, Camera, LogOut, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/play")({
  head: () => ({ meta: [{ title: "Play — Quest Connect" }] }),
  component: PlayPage,
});

type Quest = { id: string; title: string; description: string; type: string; points_awarded: number; emoji: string | null };

function PlayPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [attendee, setAttendee] = useState<{ id: string; name: string } | null>(null);
  const [active, setActive] = useState<Quest | null>(null);

  useEffect(() => {
    const a = getLocalAttendee();
    if (!a) { navigate({ to: "/join" }); return; }
    setAttendee(a);
  }, [navigate]);

  const me = useQuery({
    queryKey: ["me-anon", attendee?.id],
    enabled: !!attendee,
    queryFn: async () => {
      const { data, error } = await supabase.from("attendees").select("*").eq("id", attendee!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const pod = useQuery({
    queryKey: ["my-pod", me.data?.group_id],
    enabled: !!me.data?.group_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("id, group_name, pod_rationale").eq("id", me.data!.group_id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const quests = useQuery({
    queryKey: ["quests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quests").select("*").order("type").order("points_awarded", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Quest[];
    },
  });

  const completed = useQuery({
    queryKey: ["completed-anon", attendee?.id],
    enabled: !!attendee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("completed_quests")
        .select("id, quest_id, quest_photo_url")
        .eq("attendee_id", attendee!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rank = useQuery({
    queryKey: ["rank-anon", attendee?.id, me.data?.points],
    enabled: !!me.data,
    queryFn: async () => {
      const { count } = await supabase
        .from("attendees").select("id", { count: "exact", head: true }).gt("points", me.data!.points);
      return (count ?? 0) + 1;
    },
  });

  const completedMap = new Map((completed.data ?? []).map((c) => [c.quest_id, c]));

  const leave = () => { clearLocalAttendee(); navigate({ to: "/" }); };

  if (!attendee || me.isLoading) {
    return <div className="grid place-items-center min-h-screen"><Loader2 className="animate-spin h-6 w-6 text-lime" /></div>;
  }

  const profileBits = [me.data?.university, me.data?.academic_background, me.data?.ai_experience, me.data?.track_intent]
    .filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between text-sm">
          <Link to="/" className="font-semibold tracking-tight">Quest Connect</Link>
          <Button variant="ghost" size="sm" onClick={leave} className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4 mr-1" />Leave
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-8">
        {/* Profile + stats */}
        <section className="border border-border">
          <div className="grid sm:grid-cols-[1fr_auto] divide-y sm:divide-y-0 sm:divide-x divide-border">
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
              {pod.data && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-lime">Your pod</p>
                  <p className="text-sm font-medium mt-1">{pod.data.group_name}</p>
                  {pod.data.pod_rationale && <p className="text-xs text-muted-foreground mt-1">{pod.data.pod_rationale}</p>}
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-1 sm:w-44">
              <Stat label="Points" value={me.data?.points ?? 0} accent />
              <Stat label="Rank" value={rank.data ? `#${rank.data}` : "—"} />
              <Stat label="Done" value={completed.data?.length ?? 0} />
            </div>
          </div>
        </section>

        {/* Quest board */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-semibold tracking-tight">Quest board</h2>
            <p className="text-xs text-muted-foreground">Photo proof required.</p>
          </div>
          {quests.isLoading ? (
            <div className="border border-border p-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-lime" /></div>
          ) : (quests.data ?? []).length === 0 ? (
            <div className="border border-border p-10 text-center text-sm text-muted-foreground">No quests yet.</div>
          ) : (
            <div className="grid gap-px bg-border border border-border sm:grid-cols-2 lg:grid-cols-3">
              {(quests.data ?? []).map((q) => {
                const done = completedMap.get(q.id);
                return (
                  <div key={q.id} className="bg-background p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg" aria-hidden>{q.emoji ?? "⭐"}</span>
                        <h3 className="font-medium text-sm truncate">{q.title}</h3>
                      </div>
                      <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 border ${q.type === "main" ? "border-lime text-lime" : "border-border text-muted-foreground"}`}>
                        {q.type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{q.description}</p>
                    {done?.quest_photo_url && (
                      <img src={done.quest_photo_url} alt="" className="h-20 w-full object-cover border border-border" />
                    )}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="text-xs font-semibold text-lime">+{q.points_awarded}</span>
                      {done ? (
                        <span className="text-[10px] uppercase tracking-wider text-lime inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />Claimed
                        </span>
                      ) : (
                        <Button size="sm" onClick={() => setActive(q)} className="bg-lime hover:opacity-90 h-7 text-xs">
                          <Camera className="h-3 w-3 mr-1" />Claim
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {active && (
        <ClaimDialog
          quest={active}
          attendeeId={attendee.id}
          onClose={() => setActive(null)}
          onClaimed={() => {
            qc.invalidateQueries({ queryKey: ["me-anon"] });
            qc.invalidateQueries({ queryKey: ["completed-anon"] });
            qc.invalidateQueries({ queryKey: ["rank-anon"] });
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="p-4 border-b sm:border-b border-border last:border-b-0">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold mt-1 ${accent ? "text-lime" : ""}`}>{value}</p>
    </div>
  );
}

function ClaimDialog({
  quest, attendeeId, onClose, onClaimed,
}: { quest: Quest; attendeeId: string; onClose: () => void; onClaimed: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => { setFile(f); setPreview(f ? URL.createObjectURL(f) : null); };

  const submit = async () => {
    if (!file) return toast.error("Photo required.");
    if (file.size > 8 * 1024 * 1024) return toast.error("Max 8 MB.");
    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${attendeeId}/${quest.id}-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("quest-photos").upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { data: pub } = supabase.storage.from("quest-photos").getPublicUrl(path);
      const { error: cErr } = await supabase.rpc("claim_quest_anon", {
        _attendee_id: attendeeId,
        _quest_id: quest.id,
        _photo_url: pub.publicUrl,
      });
      if (cErr) throw cErr;
      toast.success(`+${quest.points_awarded} pts`);
      onClaimed();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to claim";
      toast.error(msg.includes("duplicate") ? "Already claimed" : msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{quest.emoji} {quest.title}</DialogTitle>
          <DialogDescription>{quest.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
          {preview ? (
            <img src={preview} alt="preview" className="w-full max-h-72 object-cover border border-border" />
          ) : (
            <button type="button" onClick={() => inputRef.current?.click()}
              className="w-full h-40 border border-dashed border-border grid place-items-center text-muted-foreground hover:border-lime hover:text-lime transition">
              <div className="text-center">
                <Camera className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm">Tap to upload proof photo</p>
              </div>
            </button>
          )}
          {preview && <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>Change photo</Button>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={!file || submitting} className="bg-lime hover:opacity-90">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Claim +{quest.points_awarded}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
