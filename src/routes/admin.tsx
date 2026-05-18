import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { runMatchmaker, grantAdminToSelf } from "@/lib/matchmaker.functions";
import { generateAdminSummary } from "@/lib/ai.functions";
import { Shield, Sparkles, Crown, Loader2, FileText } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — EventQuest" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const runMatch = useServerFn(runMatchmaker);
  const grant = useServerFn(grantAdminToSelf);
  const summarize = useServerFn(generateAdminSummary);
  const [running, setRunning] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const role = useQuery({
    queryKey: ["my-role", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).eq("role", "admin").maybeSingle();
      return !!data;
    },
  });

  const leaderboard = useQuery({
    queryKey: ["leaderboard"],
    enabled: !!role.data,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendees")
        .select("id, full_name, university, points, group_id")
        .order("points", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Realtime leaderboard
  useEffect(() => {
    if (!role.data) return;
    const ch = supabase
      .channel("leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendees" }, () => {
        qc.invalidateQueries({ queryKey: ["leaderboard"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [role.data, qc]);

  const handleMatchmake = async () => {
    setRunning(true);
    try {
      const res = await runMatch();
      toast.success(`Created ${res.pods_created} pods · assigned ${res.attendees_assigned} (${res.method})`);
      if (res.rationale) toast.message(res.rationale);
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setRunning(false); }
  };

  const handleSummary = async () => {
    setSummarizing(true);
    try {
      const res = await summarize();
      setSummary(res.summary);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSummarizing(false); }
  };

  const handleClaimAdmin = async () => {
    try {
      await grant();
      toast.success("You're now an admin.");
      qc.invalidateQueries({ queryKey: ["my-role"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  if (loading || role.isLoading) {
    return <div className="min-h-screen"><AppHeader />
      <div className="grid place-items-center py-32"><Loader2 className="animate-spin h-8 w-8 text-accent" /></div>
    </div>;
  }

  if (!role.data) {
    return (
      <div className="min-h-screen"><AppHeader />
        <div className="mx-auto max-w-md px-4 py-16">
          <Card className="bg-gradient-card border-border/60 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Admin access</CardTitle>
              <CardDescription>You don't have admin yet. Claim it (first user only — afterward, only existing admins can promote).</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleClaimAdmin} className="w-full bg-gradient-hero shadow-glow">
                <Crown className="mr-2 h-4 w-4" />Claim admin role
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen"><AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Organizer Console</h1>
            <p className="text-muted-foreground text-sm">Live leaderboard and matchmaking controls.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSummary} disabled={summarizing} size="lg" variant="outline">
              {summarizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              AI Event Summary
            </Button>
            <Button onClick={handleMatchmake} disabled={running} size="lg" className="bg-gradient-hero shadow-glow">
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Run AI Matchmaker
            </Button>
          </div>
        </div>

        {summary && (
          <Card className="bg-gradient-card border-accent/40 shadow-glow">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" />Event pulse</CardTitle></CardHeader>
            <CardContent><p className="text-sm leading-relaxed">{summary}</p></CardContent>
          </Card>
        )}

        <Card className="bg-gradient-card border-border/60 shadow-card">
          <CardHeader>
            <CardTitle>Live Leaderboard</CardTitle>
            <CardDescription>Updates in real time as attendees claim quests.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="divide-y divide-border/60">
              {(leaderboard.data ?? []).map((a, i) => (
                <li key={a.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className={`grid h-9 w-9 place-items-center rounded-full font-bold ${
                      i === 0 ? "bg-gradient-hero text-primary-foreground shadow-glow" :
                      i === 1 ? "bg-accent/30 text-accent" :
                      i === 2 ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
                    }`}>{i + 1}</span>
                    <div>
                      <p className="font-medium">{a.full_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground">{a.university}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.group_id && <Badge variant="outline" className="text-xs">In pod</Badge>}
                    <span className="font-bold text-accent">{a.points} pts</span>
                  </div>
                </li>
              ))}
              {(leaderboard.data ?? []).length === 0 && (
                <li className="py-8 text-center text-sm text-muted-foreground">No attendees yet.</li>
              )}
            </ol>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
