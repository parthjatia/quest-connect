import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quest Connect — Pick your lens" },
      { name: "description", content: "Event matchmaking and quests. Organizer, attendee, or sponsor." },
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
            One event.<br />Three lenses.
          </h1>
          <p className="text-muted-foreground mt-4 text-base">
            Run it. Play it. Sponsor it.
          </p>
        </div>

        <div className="grid gap-6 mt-12 sm:grid-cols-3">
          <DoorCard
            to="/auth"
            search={{ mode: "admin" }}
            tag="Organizer"
            title="Run the event"
            blurb="Seed attendees, manage quests, watch the leaderboard, launch sponsor activations."
            cta="Open admin"
            variant="blue"
          />
          <DoorCard
            to="/auth"
            tag="Attendee"
            title="Play the event"
            blurb="Join quests, find your people, earn points, and discover who to meet next."
            cta="Join in"
            variant="yellow"
          />
          <DoorCard
            to="/auth"
            search={{ mode: "sponsor" }}
            tag="Sponsor"
            title="Submit a side quest"
            blurb="Sign in as a sponsor and propose your own side quest for attendees. An organizer reviews before it goes live."
            cta="Open sponsor portal"
            variant="green"
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

const VARIANTS = {
  blue: {
    bg: "bg-[oklch(0.85_0.08_250)]",
    tag: "text-[oklch(0.35_0.12_250)]/70",
    title: "text-[oklch(0.25_0.12_250)]",
    body: "text-[oklch(0.3_0.08_250)]/80",
    cta: "text-[oklch(0.3_0.15_250)]",
  },
  yellow: {
    bg: "bg-[oklch(0.9_0.1_85)]",
    tag: "text-[oklch(0.4_0.12_60)]/70",
    title: "text-[oklch(0.3_0.12_55)]",
    body: "text-[oklch(0.35_0.08_60)]/80",
    cta: "text-[oklch(0.4_0.15_50)]",
  },
  green: {
    bg: "bg-[oklch(0.88_0.09_145)]",
    tag: "text-[oklch(0.35_0.1_145)]/70",
    title: "text-[oklch(0.28_0.1_145)]",
    body: "text-[oklch(0.32_0.08_145)]/80",
    cta: "text-[oklch(0.35_0.13_145)]",
  },
} as const;

function DoorCard({
  to,
  search,
  tag,
  title,
  blurb,
  cta,
  variant,
}: {
  to: string;
  search?: { mode: "admin" };
  tag: string;
  title: string;
  blurb: string;
  cta: string;
  variant: keyof typeof VARIANTS;
}) {
  const v = VARIANTS[variant];
  return (
    <Link
      to={to}
      search={search}
      className={`group block rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${v.bg}`}
    >
      <p className={`text-[10px] uppercase tracking-[0.2em] font-semibold ${v.tag}`}>{tag}</p>
      <h2 className={`text-2xl font-semibold mt-2 tracking-tight ${v.title}`}>{title}</h2>
      <p className={`text-sm mt-3 max-w-sm ${v.body}`}>{blurb}</p>
      <p className={`mt-8 text-sm font-medium group-hover:underline ${v.cta}`}>{cta} →</p>
    </Link>
  );
}
