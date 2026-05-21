import { createFileRoute, Link } from "@tanstack/react-router";
import { Sliders, Gamepad2, Sparkles, ArrowRight } from "lucide-react";
import { AnimatedHeadline } from "@/components/animated-text";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quey — Pick your lens" },
      { name: "description", content: "Event matchmaking and quests. Organizer, attendee, or sponsor." },
    ],
  }),
  component: Landing,
});

type Portal = {
  to: string;
  search?: Record<string, string>;
  kicker: string;
  title: string;
  blurb: string;
  cta: string;
  Icon: typeof Sliders;
  accent: "cyan" | "gold" | "slate";
};

const PORTALS: Portal[] = [
  {
    to: "/auth",
    search: { mode: "admin" },
    kicker: "Organizer",
    title: "Run the event",
    blurb: "Seed attendees, manage quests, watch the leaderboard, launch sponsor activations.",
    cta: "Open admin",
    Icon: Sliders,
    accent: "cyan",
  },
  {
    to: "/auth",
    kicker: "Attendee",
    title: "Play the event",
    blurb: "Join quests, find your people, earn points, and discover who to meet next.",
    cta: "Join in",
    Icon: Gamepad2,
    accent: "gold",
  },
  {
    to: "/sponsor",
    kicker: "Sponsor",
    title: "Submit a side quest",
    blurb: "Sign in as a sponsor and propose your own side quest for attendees to complete.",
    cta: "Open sponsor portal",
    Icon: Sparkles,
    accent: "slate",
  },
];

const ACCENT = {
  cyan: {
    label: "text-primary",
    tile: "bg-secondary border-border text-primary",
    cta: "text-primary",
  },
  gold: {
    label: "text-primary",
    tile: "bg-secondary border-border text-primary",
    cta: "text-primary",
  },
  slate: {
    label: "text-muted-foreground",
    tile: "bg-secondary border-border text-foreground",
    cta: "text-foreground",
  },
} as const;

function Landing() {
  return (
    <div className="relative min-h-screen w-full bg-background text-foreground overflow-hidden">
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-6 pt-12 pb-10">
        {/* Header */}
        <header className="pt-4 pb-10">
          <div className="inline-block mb-5 border border-border bg-card px-3 py-1 rounded-md">
            <span className="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
              Quey
            </span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
            <span className="text-stage mb-3 mr-2 align-middle">
              <AnimatedHeadline>One event.</AnimatedHeadline>
            </span>
            <br />
            <span className="text-stage mt-2 align-middle text-primary">
              Three lenses.
            </span>
          </h1>
          <p className="mt-5 text-sm font-medium tracking-wide text-muted-foreground sm:text-base">
            Run it. Play it. Sponsor it.
          </p>
        </header>

        {/* Portal cards — solid surface, hairline border, single accent on hover */}
        <section className="flex flex-col gap-5">
          {PORTALS.map((p) => {
            const a = ACCENT[p.accent];
            return (
              <Link
                key={p.kicker}
                to={p.to}
                search={p.search}
                className="group relative block text-left"
              >
                <div className="bg-card border border-border rounded-lg relative overflow-hidden p-5 active:scale-[0.98] hover:border-primary/60">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className={`font-['Space_Grotesk'] mb-1 text-[10px] font-bold uppercase tracking-[0.2em] ${a.label}`}>
                        {p.kicker}
                      </p>
                      <h2 className="text-xl font-bold text-foreground">{p.title}</h2>
                    </div>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center border rounded-md ${a.tile}`}>
                      <p.Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mb-4 text-xs leading-relaxed text-muted-foreground">{p.blurb}</p>
                  <div className={`flex items-center gap-1 text-xs font-bold ${a.cta}`}>
                    <span>{p.cta}</span>
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

        {/* Footer */}
        <footer className="mt-auto pt-10 text-center">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
            No accounts. No passwords. Walk in.
          </p>
        </footer>
      </main>
    </div>
  );
}
