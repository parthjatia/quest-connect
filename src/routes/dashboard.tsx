import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { generateQuestFeedback } from "@/lib/ai.functions";
import { Trophy, Zap, Users, CheckCircle2, Loader2, Camera, Sparkles } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — EventQuest" }] }),
  component: Dashboard,
});

type Quest = { id: string; title: string; description: string; type: string; points_awarded: number; emoji: string | null };

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const feedbackFn = useServerFn(generateQuestFeedback);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  const me = useQuery({
    queryKey: ["me", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("attendees").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  

  const squad = useQuery({
    queryKey: ["squad", me.data?.group_id],
    enabled: !!me.data?.group_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendees")
        .select("id, full_name, points, university")
        .eq("group_id", me.data!.group_id!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const quests = useQuery({
    queryKey: ["quests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quests").select("*").eq("approval_status", "approved").order("type").order("points_awarded", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Quest[];
    },
  });

  const completed = useQuery({
    queryKey: ["completed", me.data?.id],
    enabled: !!me.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("completed_quests")
        .select("id, quest_id, quest_photo_url, ai_feedback")
        .eq("attendee_id", me.data!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rank = useQuery({
    queryKey: ["rank", user?.id, me.data?.points],
    enabled: !!user && !!me.data,
    queryFn: async () => {
      const { count } = await supabase
        .from("attendees").select("id", { count: "exact", head: true }).gt("points", me.data!.points);
      return (count ?? 0) + 1;
    },
  });

  const completedMap = new Map((completed.data ?? []).map((c) => [c.quest_id, c]));
  const [active, setActive] = useState<Quest | null>(null);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {(loading || me.isLoading) ? (
          <div className="grid place-items-center py-32"><Loader2 className="animate-spin h-8 w-8 text-accent" /></div>
        ) : !me.data ? null : (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              <StatCard icon={Zap} label="Points" value={me.data.points} accent />
              <StatCard icon={Trophy} label="Rank" value={rank.data ? `#${rank.data}` : "—"} />
              <StatCard icon={CheckCircle2} label="Quests done" value={completed.data?.length ?? 0} />
            </section>

            {me.data.icebreakers && (
              <Card className="bg-gradient-card border-border/60 shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-accent" />AI Icebreakers — say these to a stranger</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans">{me.data.icebreakers}</pre>
                </CardContent>
              </Card>
            )}

            <Card className="bg-gradient-card border-border/60 shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-accent" />My Squad</CardTitle>
                {me.data.group_id && <Badge variant="outline" className="text-xs">Pod assigned</Badge>}
              </CardHeader>
              <CardContent>
                {!me.data.group_id ? (
                  <p className="text-sm text-muted-foreground">Awaiting matchmaking. An organizer will assemble your pod shortly.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {(squad.data ?? []).map((m) => (
                      <div key={m.id} className="rounded-lg border border-border/60 bg-background/40 p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{m.full_name}{m.id === me.data!.id && <span className="ml-2 text-xs text-accent">(you)</span>}</p>
                          <p className="text-xs text-muted-foreground">{m.university}</p>
                        </div>
                        <span className="text-sm font-semibold text-accent">{m.points} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Quest Board</h2>
                <Button asChild variant="outline" size="sm"><Link to="/wrapped">View my Wrapped →</Link></Button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Tap a quest, upload your proof photo, and AI will hype you up.</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {(quests.data ?? []).map((q) => {
                  const done = completedMap.get(q.id);
                  return (
                    <Card key={q.id} className={`relative overflow-hidden border-border/60 transition-all ${done ? "opacity-80" : "hover:shadow-glow hover:-translate-y-0.5"} bg-gradient-card shadow-card`}>
                      <div className={`absolute inset-x-0 top-0 h-1 ${q.type === "main" ? "bg-gradient-hero" : "bg-accent/60"}`} />
                      <CardContent className="pt-6 space-y-3">
                        <div className="flex items-start justify-between">
                          <span className="text-3xl" aria-hidden>{q.emoji ?? "⭐"}</span>
                          <Badge variant={q.type === "main" ? "default" : "outline"} className={q.type === "main" ? "bg-gradient-hero" : ""}>
                            {q.type === "main" ? "MAIN" : "SIDE"}
                          </Badge>
                        </div>
                        <div>
                          <h3 className="font-semibold">{q.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{q.description}</p>
                        </div>
                        {done?.quest_photo_url && (
                          <img src={done.quest_photo_url} alt="proof" className="w-full h-24 object-cover rounded-md border border-border/60" />
                        )}
                        {done?.ai_feedback && (
                          <p className="text-xs italic text-accent border-l-2 border-accent pl-2">{done.ai_feedback}</p>
                        )}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-sm font-bold text-accent">+{q.points_awarded} pts</span>
                          {done ? (
                            <span className="text-xs flex items-center gap-1 text-success"><CheckCircle2 className="h-4 w-4" />Claimed</span>
                          ) : (
                            <Button size="sm" onClick={() => setActive(q)}>
                              <Camera className="mr-1 h-3 w-3" />Claim
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>

      {active && me.data && (
        <ClaimDialog
          quest={active}
          userId={user!.id}
          onClose={() => setActive(null)}
          onClaimed={() => {
            qc.invalidateQueries({ queryKey: ["me"] });
            qc.invalidateQueries({ queryKey: ["completed"] });
            qc.invalidateQueries({ queryKey: ["rank"] });
          }}
          requestFeedback={feedbackFn}
        />
      )}
    </div>
  );
}

function ClaimDialog({
  quest, userId, onClose, onClaimed, requestFeedback,
}: {
  quest: Quest;
  userId: string;
  onClose: () => void;
  onClaimed: () => void;
  requestFeedback: (args: { data: { completed_id: string } }) => Promise<{ feedback: string }>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const submit = async () => {
    if (!file) return toast.error("Photo required.");
    if (file.size > 8 * 1024 * 1024) return toast.error("Max 8 MB.");
    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${quest.id}-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("quest-photos").upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { data: pub } = supabase.storage.from("quest-photos").getPublicUrl(path);
      const { data: claim, error: cErr } = await supabase.rpc("claim_quest", { _quest_id: quest.id, _photo_url: pub.publicUrl });
      if (cErr) throw cErr;
      toast.success(`+${quest.points_awarded} pts! Hype incoming…`);
      onClaimed();
      onClose();
      // Fire-and-forget AI feedback
      const completedId = (claim as { completed_id: string } | null)?.completed_id;
      if (completedId) {
        requestFeedback({ data: { completed_id: completedId } })
          .then(() => onClaimed())
          .catch((e) => console.error("Feedback error:", e));
      }
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
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {preview ? (
            <img src={preview} alt="preview" className="w-full max-h-72 object-cover rounded-lg border border-border/60" />
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full h-48 rounded-lg border-2 border-dashed border-border/60 grid place-items-center text-muted-foreground hover:border-accent hover:text-accent transition"
            >
              <div className="text-center">
                <Camera className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Tap to upload proof photo</p>
              </div>
            </button>
          )}
          {preview && (
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>Change photo</Button>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={!file || submitting} className="bg-gradient-hero shadow-glow">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Claim +{quest.points_awarded} pts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof Trophy; label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <Card className={`bg-gradient-card border-border/60 ${accent ? "shadow-glow" : "shadow-card"}`}>
      <CardContent className="flex items-center gap-4 py-5">
        <div className={`grid h-12 w-12 place-items-center rounded-xl ${accent ? "bg-gradient-hero" : "bg-secondary"}`}>
          <Icon className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
