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
    halo: "from-[#39ff14] to-[#39ff14] opacity-20 group-hover:opacity-50",
    label: "text-neon",
    tile: "bg-[#39ff14]/15 border-[#39ff14]/40 text-neon",
    cta: "text-neon",
  },
  gold: {
    halo: "from-[#ff2d87] to-[#ff2d87] opacity-25 group-hover:opacity-50",
    label: "text-neon-magenta",
    tile: "bg-[#ff2d87]/15 border-[#ff2d87]/40 text-neon-magenta",
    cta: "text-neon-magenta",
  },
  slate: {
    halo: "from-white/30 to-white/10 opacity-15 group-hover:opacity-30",
    label: "text-slate-300",
    tile: "bg-white/5 border-white/15 text-slate-200",
    cta: "text-slate-100",
  },
} as const;

function Landing() {
  return (
    <div className="relative min-h-screen w-full bg-neon-base text-foreground overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-neon-lines opacity-40" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-6 pt-12 pb-10">
        {/* Header */}
        <header className="pt-4 pb-10">
          <div className="inline-block mb-5 border border-[#39ff14]/60 bg-black px-3 py-1">
            <span className="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-[0.25em] text-neon">
              Quey
            </span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            <AnimatedHeadline>One event.</AnimatedHeadline>
            <br />
            <span className="text-neon-shine">
              Three lenses.
            </span>
          </h1>
          <p className="mt-5 text-sm font-medium tracking-wide text-slate-300 sm:text-base">
            Run it. Play it. Sponsor it.
          </p>
        </header>

        {/* Portal cards — flat, sharp corners, no glow */}
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
                <div className="panel-neon relative overflow-hidden p-5 active:scale-[0.98]">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className={`font-['Space_Grotesk'] mb-1 text-[10px] font-bold uppercase tracking-[0.2em] ${a.label}`}>
                        {p.kicker}
                      </p>
                      <h2 className="text-xl font-bold text-white">{p.title}</h2>
                    </div>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center border ${a.tile}`}>
                      <p.Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mb-4 text-xs leading-relaxed text-slate-400">{p.blurb}</p>
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
          <p className="text-[11px] font-medium tracking-wide text-slate-500">
            No accounts. No passwords. Walk in.
          </p>
        </footer>
      </main>
    </div>
  );
}
