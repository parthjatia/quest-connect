import { createFileRoute, Link } from "@tanstack/react-router";
import { Sliders, Gamepad2, Sparkles, ArrowRight } from "lucide-react";
import { FloatingDecor } from "@/components/floating-decor";
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
    halo: "from-cyan-500 to-blue-600 opacity-20 group-hover:opacity-40",
    label: "text-cyan-300",
    tile: "bg-cyan-500/15 border-cyan-400/30 text-cyan-300",
    cta: "text-cyan-300",
  },
  gold: {
    halo: "from-yellow-400 to-orange-500 opacity-25 group-hover:opacity-50",
    label: "text-yellow-400",
    tile: "bg-yellow-500/15 border-yellow-400/30 text-yellow-300",
    cta: "text-yellow-300",
  },
  slate: {
    halo: "from-slate-400 to-slate-500 opacity-10 group-hover:opacity-20",
    label: "text-slate-400",
    tile: "bg-white/5 border-white/10 text-slate-300",
    cta: "text-slate-200",
  },
} as const;

function Landing() {
  return (
    <div className="relative min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_#0a3a4a_0%,_#06202c_45%,_#04121b_100%)] text-foreground overflow-hidden">
      {/* Ambient gold-coin + dice decor */}
      <FloatingDecor variant="ambient" className="fixed inset-0 z-0" />

      {/* Subtle radial glows */}
      <div className="pointer-events-none absolute -top-32 -left-20 h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-blue-600/10 blur-[120px]" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-6 pt-12 pb-10">
        {/* Header */}
        <header className="pt-4 pb-10">
          <div className="inline-block mb-5 rounded-full border border-yellow-400/30 bg-yellow-500/10 px-3 py-1">
            <span className="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-300">
              Quey
            </span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            <AnimatedHeadline>One event.</AnimatedHeadline>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Three lenses.
            </span>
          </h1>
          <p className="mt-5 text-sm font-medium tracking-wide text-slate-400 sm:text-base">
            Run it. Play it. Sponsor it.
          </p>
        </header>

        {/* Portal cards */}
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
                <div
                  className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-r ${a.halo} blur transition duration-500`}
                />
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl transition-all duration-300 active:scale-[0.98]">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className={`font-['Space_Grotesk'] mb-1 text-[10px] font-bold uppercase tracking-[0.2em] ${a.label}`}>
                        {p.kicker}
                      </p>
                      <h2 className="text-xl font-bold text-white">{p.title}</h2>
                    </div>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${a.tile}`}>
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
