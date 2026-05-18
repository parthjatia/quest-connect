import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { Trophy, Zap, Users, CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — EventQuest" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const me = useQuery({
    queryKey: ["me", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("attendees").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (me.data && !me.data.onboarded) navigate({ to: "/onboarding" });
  }, [me.data, navigate]);

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
      const { data, error } = await supabase.from("quests").select("*").order("type").order("points_awarded", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const completed = useQuery({
    queryKey: ["completed", me.data?.id],
    enabled: !!me.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("completed_quests").select("quest_id").eq("attendee_id", me.data!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.quest_id));
    },
  });

  const rank = useQuery({
    queryKey: ["rank", user?.id],
    enabled: !!user && !!me.data,
    queryFn: async () => {
      const { count } = await supabase
        .from("attendees")
        .select("id", { count: "exact", head: true })
        .gt("points", me.data!.points);
      return (count ?? 0) + 1;
    },
  });

  const [claiming, setClaiming] = useState<string | null>(null);
  const claim = async (questId: string) => {
    setClaiming(questId);
    const { error } = await supabase.rpc("claim_quest", { _quest_id: questId });
    setClaiming(null);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Already claimed" : error.message);
      return;
    }
    toast.success("Points claimed! ⚡");
    qc.invalidateQueries({ queryKey: ["me"] });
    qc.invalidateQueries({ queryKey: ["completed"] });
    qc.invalidateQueries({ queryKey: ["rank"] });
  };

  if (loading || me.isLoading) {
    return (
      <div className="min-h-screen"><AppHeader />
        <div className="grid place-items-center py-32"><Loader2 className="animate-spin h-8 w-8 text-accent" /></div>
      </div>
    );
  }
  if (!me.data) return null;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* Stats bar */}
        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={Zap} label="Points" value={me.data.points} accent />
          <StatCard icon={Trophy} label="Rank" value={rank.data ? `#${rank.data}` : "—"} />
          <StatCard icon={CheckCircle2} label="Quests done" value={completed.data?.size ?? 0} />
        </section>

        {/* Squad */}
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

        {/* Quest board */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Quest Board</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(quests.data ?? []).map((q) => {
              const done = completed.data?.has(q.id);
              return (
                <Card key={q.id} className={`relative overflow-hidden border-border/60 transition-all ${done ? "opacity-60" : "hover:shadow-glow hover:-translate-y-0.5"} bg-gradient-card shadow-card`}>
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
                      <p className="text-xs text-muted-foreground mt-1">{q.description}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm font-bold text-accent">+{q.points_awarded} pts</span>
                      {done ? (
                        <span className="text-xs flex items-center gap-1 text-success"><CheckCircle2 className="h-4 w-4" />Claimed</span>
                      ) : (
                        <Button size="sm" disabled={claiming === q.id} onClick={() => claim(q.id)}>
                          {claiming === q.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Claim"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </main>
    </div>
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
