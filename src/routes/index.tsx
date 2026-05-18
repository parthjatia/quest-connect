import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quest Connect — Pick your door" },
      { name: "description", content: "Event matchmaking and quests. Admin or attendee." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between text-sm">
          <span className="font-semibold tracking-tight">Quest Connect</span>
          <span className="text-muted-foreground">demo</span>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-lime text-xs uppercase tracking-[0.2em] mb-4">Event OS</p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">
            One event.<br />Two doors.
          </h1>
          <p className="text-muted-foreground mt-4 text-base">
            Pick the side you're walking in from.
          </p>
        </div>

        <div className="grid gap-px bg-border border border-border mt-12 sm:grid-cols-2">
          <DoorCard
            to="/admin"
            tag="Organizer"
            title="Run the event"
            blurb="Seed attendees, manage quests, watch the leaderboard, run the matchmaker."
            cta="Open admin"
          />
          <DoorCard
            to="/join"
            tag="Attendee"
            title="Play the event"
            blurb="Join with your name or pick from the roster. Claim quests with proof photos."
            cta="Join in"
          />
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-4 text-xs text-muted-foreground">
          No accounts. No passwords. Walk in.
        </div>
      </footer>
    </div>
  );
}

function DoorCard({ to, tag, title, blurb, cta }: { to: string; tag: string; title: string; blurb: string; cta: string }) {
  return (
    <Link to={to} className="group bg-background p-8 hover:bg-card transition-colors">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{tag}</p>
      <h2 className="text-2xl font-semibold mt-2 tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground mt-3 max-w-sm">{blurb}</p>
      <p className="mt-8 text-sm text-lime group-hover:underline">{cta} →</p>
    </Link>
  );
}
