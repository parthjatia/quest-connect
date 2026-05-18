import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getLocalAttendee, clearLocalAttendee } from "@/lib/local-attendee";
import { toast } from "sonner";
import { Trophy, Zap, CheckCircle2, Loader2, Camera, Sparkles, LogOut } from "lucide-react";

export const Route = createFileRoute("/play")({
  head: () => ({ meta: [{ title: "Play — EventQuest" }] }),
  component: PlayPage,
});

type Quest = { id: string; title: string; description: string; type: string; points_awarded: number; emoji: string | null };

function PlayPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [attendee, setAttendee] = useState<{ id: string; name: string } | null>(null);

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
        .select("id, quest_id, quest_photo_url, ai_feedback")
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
  const [active, setActive] = useState<Quest | null>(null);

  const leave = () => {
    clearLocalAttendee();
    navigate({ to: "/" });
  };

  if (!attendee || me.isLoading) {
    return <div className="grid place-items-center min-h-screen"><Loader2 className="animate-spin h-8 w-8 text-accent" /></div>;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-[Bangers,sans-serif] text-2xl tracking-wider">EventQuest</Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">Hey, <span className="font-semibold text-foreground">{attendee.name}</span></span>
            <Button variant="ghost" size="sm" onClick={leave}><LogOut className="h-4 w-4 mr-1" />Leave</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={Zap} label="Points" value={me.data?.points ?? 0} accent />
          <StatCard icon={Trophy} label="Rank" value={rank.data ? `#${rank.data}` : "—"} />
          <StatCard icon={CheckCircle2} label="Quests done" value={completed.data?.length ?? 0} />
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-2">Quest Board</h2>
          <p className="text-sm text-muted-foreground mb-4">Tap a quest, upload your proof photo, claim your points.</p>
          {quests.isLoading ? (
            <div className="grid place-items-center py-16"><Loader2 className="animate-spin h-6 w-6 text-accent" /></div>
          ) : (quests.data ?? []).length === 0 ? (
            <Card className="bg-gradient-card border-border/60"><CardContent className="py-12 text-center text-muted-foreground">No quests yet. The organizer hasn't added any.</CardContent></Card>
          ) : (
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
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-sm font-bold text-accent">+{q.points_awarded} pts</span>
                        {done ? (
                          <span className="text-xs flex items-center gap-1 text-green-500"><CheckCircle2 className="h-4 w-4" />Claimed</span>
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

function ClaimDialog({
  quest, attendeeId, onClose, onClaimed,
}: {
  quest: Quest; attendeeId: string; onClose: () => void; onClaimed: () => void;
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
      toast.success(`+${quest.points_awarded} pts! Nice one.`);
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
