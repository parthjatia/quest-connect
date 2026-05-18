import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown, Loader2, Plus, Trash2, Sparkles, Users, Trophy, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — EventQuest" }] }),
  component: AdminPage,
});

type Quest = { id: string; title: string; description: string; type: string; points_awarded: number; emoji: string | null };
type Attendee = { id: string; full_name: string | null; points: number; group_id: string | null };

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
        .select("id, full_name, points, group_id")
        .order("points", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Attendee[];
    },
  });

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("admin-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendees" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-attendees"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "completed_quests" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-attendees"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
            <span className="font-[Bangers,sans-serif] text-2xl tracking-wider">EventQuest</span>
            <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0"><Crown className="h-3 w-3 mr-1" />Admin</Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Organizer Console</h1>
          <p className="text-muted-foreground text-sm">Manage quests, watch attendees roll in, form squads.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={Users} label="Attendees" value={attendees.data?.length ?? 0} />
          <StatCard icon={Trophy} label="Total points" value={(attendees.data ?? []).reduce((s, a) => s + a.points, 0)} />
          <StatCard icon={Sparkles} label="Quests live" value={quests.data?.length ?? 0} accent />
        </div>

        <Tabs defaultValue="quests" className="space-y-4">
          <TabsList>
            <TabsTrigger value="quests">Quests</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="squads">Squads</TabsTrigger>
          </TabsList>

          <TabsContent value="quests" className="space-y-4">
            <QuestManager quests={quests.data ?? []} loading={quests.isLoading} />
          </TabsContent>

          <TabsContent value="leaderboard">
            <Leaderboard attendees={attendees.data ?? []} loading={attendees.isLoading} />
          </TabsContent>

          <TabsContent value="squads">
            <SquadManager attendees={attendees.data ?? []} />
          </TabsContent>
        </Tabs>
      </main>
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
      reset();
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-quests"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this quest?")) return;
    const { error } = await supabase.from("quests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-quests"] });
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{quests.length} quest{quests.length === 1 ? "" : "s"} live</p>
        <Button onClick={() => setOpen(!open)} size="sm" className="bg-gradient-hero shadow-glow">
          <Plus className="h-4 w-4 mr-1" />{open ? "Cancel" : "New Quest"}
        </Button>
      </div>

      {open && (
        <Card className="bg-gradient-card border-accent/40 shadow-glow">
          <CardHeader><CardTitle className="text-base">New Quest</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Emoji</label>
                <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} className="text-center text-2xl" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Meet 3 founders" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What does the attendee need to do?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Points</label>
                <Input type="number" min={1} max={500} value={points} onChange={(e) => setPoints(parseInt(e.target.value) || 10)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Type</label>
                <div className="flex gap-2 mt-1">
                  <Button type="button" variant={type === "side" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setType("side")}>Side</Button>
                  <Button type="button" variant={type === "main" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setType("main")}>Main</Button>
                </div>
              </div>
            </div>
            <Button onClick={add} disabled={busy} className="w-full bg-gradient-hero shadow-glow">
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Quest
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid place-items-center py-12"><Loader2 className="animate-spin h-6 w-6 text-accent" /></div>
      ) : quests.length === 0 ? (
        <Card className="bg-gradient-card border-border/60"><CardContent className="py-12 text-center text-muted-foreground">No quests yet. Hit "New Quest" to add one.</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quests.map((q) => (
            <Card key={q.id} className="bg-gradient-card border-border/60 relative">
              <div className={`absolute inset-x-0 top-0 h-1 ${q.type === "main" ? "bg-gradient-hero" : "bg-accent/60"}`} />
              <CardContent className="pt-6 space-y-2">
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{q.emoji ?? "⭐"}</span>
                  <Badge variant={q.type === "main" ? "default" : "outline"} className={q.type === "main" ? "bg-gradient-hero" : ""}>
                    {q.type === "main" ? "MAIN" : "SIDE"}
                  </Badge>
                </div>
                <h3 className="font-semibold">{q.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{q.description}</p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-bold text-accent">+{q.points_awarded} pts</span>
                  <Button variant="ghost" size="sm" onClick={() => del(q.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function Leaderboard({ attendees, loading }: { attendees: Attendee[]; loading: boolean }) {
  return (
    <Card className="bg-gradient-card border-border/60 shadow-card">
      <CardHeader>
        <CardTitle>Live Leaderboard</CardTitle>
        <CardDescription>Updates in real time as attendees claim quests.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid place-items-center py-12"><Loader2 className="animate-spin h-6 w-6 text-accent" /></div>
        ) : attendees.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No attendees yet. Share the link!</p>
        ) : (
          <ol className="divide-y divide-border/60">
            {attendees.map((a, i) => (
              <li key={a.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className={`grid h-9 w-9 place-items-center rounded-full font-bold ${
                    i === 0 ? "bg-gradient-hero text-primary-foreground shadow-glow" :
                    i === 1 ? "bg-accent/30 text-accent" :
                    i === 2 ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
                  }`}>{i + 1}</span>
                  <p className="font-medium">{a.full_name || "Unnamed"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {a.group_id && <Badge variant="outline" className="text-xs">In squad</Badge>}
                  <span className="font-bold text-accent">{a.points} pts</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function SquadManager({ attendees }: { attendees: Attendee[] }) {
  const qc = useQueryClient();
  const [size, setSize] = useState(4);
  const [busy, setBusy] = useState(false);

  const make = async () => {
    if (attendees.length < 2) return toast.error("Need at least 2 attendees.");
    setBusy(true);
    try {
      // Clear existing groups
      await supabase.from("attendees").update({ group_id: null }).not("id", "is", null);
      await supabase.from("groups").delete().not("id", "is", null);

      // Shuffle
      const shuffled = [...attendees].sort(() => Math.random() - 0.5);
      const pods: Attendee[][] = [];
      for (let i = 0; i < shuffled.length; i += size) pods.push(shuffled.slice(i, i + size));

      for (let i = 0; i < pods.length; i++) {
        const { data: g, error: gErr } = await supabase.from("groups").insert({ group_name: `Squad ${i + 1}` }).select("id").single();
        if (gErr) throw gErr;
        const ids = pods[i].map((a) => a.id);
        await supabase.from("attendees").update({ group_id: g.id }).in("id", ids);
      }
      toast.success(`Formed ${pods.length} squads`);
      qc.invalidateQueries({ queryKey: ["admin-attendees"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  const grouped = new Map<string, Attendee[]>();
  for (const a of attendees) {
    const key = a.group_id ?? "__none__";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(a);
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-card border-border/60">
        <CardContent className="py-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground block">Squad size</label>
            <Input type="number" min={2} max={10} value={size} onChange={(e) => setSize(parseInt(e.target.value) || 4)} className="w-24" />
          </div>
          <Button onClick={make} disabled={busy} className="bg-gradient-hero shadow-glow">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Form Random Squads
          </Button>
          <p className="text-xs text-muted-foreground ml-auto">Random shuffle. AI matchmaking coming next.</p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...grouped.entries()].map(([gid, members]) => (
          <Card key={gid} className="bg-gradient-card border-border/60">
            <CardHeader className="pb-2"><CardTitle className="text-base">{gid === "__none__" ? "Unassigned" : `Squad`}</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span>{m.full_name || "Unnamed"}</span>
                  <span className="text-accent font-medium">{m.points} pts</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
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
