import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy, Users, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EventQuest — Gamify your event" },
      { name: "description", content: "Onboard, find your squad, claim quests, and unlock your Event Wrapped." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      // Check onboarding state
      (async () => {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase.from("attendees").select("onboarded").eq("user_id", user.id).maybeSingle();
        navigate({ to: data?.onboarded ? "/dashboard" : "/onboarding" });
      })();
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-20 blur-3xl" />
        <section className="mx-auto max-w-5xl px-4 py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <Sparkles className="h-3 w-3" /> Now live for the hackathon
          </span>
          <h1 className="mt-6 text-5xl sm:text-7xl font-bold tracking-tight">
            Turn your event into a <span className="bg-gradient-hero bg-clip-text text-transparent">quest</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Onboard in 30 seconds, get matched into a diverse squad, claim quests on a bingo board, climb the leaderboard, and unlock a comic-style Event Wrapped at the end.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-hero shadow-glow">
              <Link to="/auth">Start your quest</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/dashboard">View dashboard</Link>
            </Button>
          </div>

          <div className="mt-20 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Users, title: "AI Matchmaker", desc: "Get grouped with 4 diverse teammates." },
              { icon: Zap, title: "Quest Board", desc: "Bingo-style quests with real points." },
              { icon: Trophy, title: "Event Wrapped", desc: "A personalized comic at the finish." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl bg-gradient-card p-6 text-left shadow-card border border-border/60">
                <Icon className="h-6 w-6 text-accent" />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
