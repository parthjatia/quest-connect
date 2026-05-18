import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, PartyPopper, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EventQuest — Pick your role" },
      { name: "description", content: "Gamify your event. Are you running it, or playing it?" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center mb-12 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-background/10 backdrop-blur border border-white/20 text-white/90 text-xs uppercase tracking-widest mb-6">
          <Sparkles className="h-3 w-3" /> EventQuest · Demo
        </div>
        <h1 className="font-[Bangers,sans-serif] text-6xl sm:text-7xl text-white drop-shadow-lg tracking-wide">
          Who are you today?
        </h1>
        <p className="mt-4 text-white/80 text-lg">
          One event. Two doors. Pick where you walk in.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 w-full max-w-3xl">
        <RoleCard
          to="/admin"
          icon={Crown}
          title="I'm the Admin"
          subtitle="Run the event"
          blurb="Create quests, watch the leaderboard live, group attendees into squads."
          accent="from-amber-400 to-orange-500"
        />
        <RoleCard
          to="/join"
          icon={PartyPopper}
          title="I'm an Attendee"
          subtitle="Play the event"
          blurb="Type your name, grab quests, snap proof photos, climb the board."
          accent="from-fuchsia-500 to-purple-600"
        />
      </div>

      <p className="mt-10 text-xs text-white/60">No accounts. No passwords. Just walk in.</p>
    </div>
  );
}

function RoleCard({
  to, icon: Icon, title, subtitle, blurb, accent,
}: {
  to: string; icon: typeof Crown; title: string; subtitle: string; blurb: string; accent: string;
}) {
  return (
    <Link to={to} className="group">
      <Card className="relative overflow-hidden border-white/20 bg-background/95 backdrop-blur shadow-2xl transition-all duration-200 hover:-translate-y-1 hover:shadow-glow cursor-pointer h-full">
        <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accent}`} />
        <CardContent className="p-8 space-y-4">
          <div className={`inline-grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br ${accent} shadow-lg group-hover:scale-110 transition-transform`}>
            <Icon className="h-8 w-8 text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{subtitle}</p>
            <h2 className="text-3xl font-bold mt-1">{title}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{blurb}</p>
          <div className="pt-2">
            <span className="text-sm font-semibold text-accent group-hover:underline">Enter →</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
