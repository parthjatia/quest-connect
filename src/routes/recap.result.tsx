import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RecapTheme, ComicPanel, StickerBadge } from "@/components/recap/recap-theme";
import { loadPrefs, type RecapPrefs } from "@/lib/recap-store";

export const Route = createFileRoute("/recap/result")({
  head: () => ({ meta: [{ title: "Your personal visual recap" }] }),
  component: ResultPage,
});

const MOCK = {
  cover: {
    title: "The Day Ideas Collided",
    subtitle: "A personal recap of the Spring Founders' Summit",
    tag: "Issue #01",
  },
  bigPicture:
    "Three founders, two contrarian theses, one unexpected pivot. The whole room realigned around one question: who is this actually for?",
  moments: [
    { t: "09:14", text: "Maya opens with the slide nobody expected — churn isn't the metric." },
    { t: "10:02", text: "Heated debate about pricing tiers. Sage takes the room." },
    { t: "11:30", text: "Live demo crashes, then becomes the most honest moment of the day." },
    { t: "14:45", text: "Q&A — a junior PM asks the question that reframes everything." },
  ],
  decisions: [
    "Drop the enterprise tier for now",
    "Rewrite onboarding around the 'first win' moment",
    "Ship a public changelog by end of month",
  ],
  matters: [
    "You care about clarity over hype — three speakers landed that.",
    "The 'first win' framing fits how you already think about activation.",
    "Pricing debate mirrors the call you've been postponing.",
  ],
  next: [
    "Draft a one-page memo on the new activation metric",
    "Reach out to Maya re: pricing follow-up",
    "Block 90 min Friday to redesign the onboarding flow",
  ],
  memory: "You walked in skeptical. You left with one sentence that changes the next quarter.",
};

function ResultPage() {
  const [prefs, setPrefs] = useState<RecapPrefs>({});
  useEffect(() => setPrefs(loadPrefs()), []);

  return (
    <RecapTheme>
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <StickerBadge color="var(--marigold)">Your recap</StickerBadge>
            {prefs.world && <StickerBadge color="var(--sage)">{prefs.world}</StickerBadge>}
            {prefs.format && <StickerBadge color="var(--peach)">{prefs.format}</StickerBadge>}
          </div>
          <Link
            to="/recap"
            className="rounded-full border-2 px-4 py-2 text-xs font-bold uppercase tracking-wide"
            style={{ borderColor: "var(--ink)", background: "var(--cream)", color: "var(--ink)" }}
          >
            Start over
          </Link>
        </div>

        {/* 1. Cover */}
        <ComicPanel className="mb-8" bg="var(--coral)">
          <div className="text-center" style={{ color: "var(--cream)" }}>
            <div
              className="mb-3 inline-block rounded-full border-2 px-3 py-1 text-xs font-black uppercase tracking-widest"
              style={{ borderColor: "var(--cream)" }}
            >
              {MOCK.cover.tag}
            </div>
            <h1 className="text-4xl font-black leading-none md:text-6xl">{MOCK.cover.title}</h1>
            <p className="mx-auto mt-4 max-w-xl text-lg opacity-90">{MOCK.cover.subtitle}</p>
          </div>
        </ComicPanel>

        {/* 2. Big Picture */}
        <Section title="Big Picture" number={2} color="var(--marigold)" tilt={-0.4}>
          <p className="text-xl font-semibold leading-snug">{MOCK.bigPicture}</p>
        </Section>

        {/* 3. Key Moments */}
        <Section title="Key Moments" number={3} color="var(--teal)" tilt={0.4}>
          <ul className="space-y-3">
            {MOCK.moments.map((m) => (
              <li
                key={m.t}
                className="flex gap-4 rounded-xl border-2 p-3"
                style={{ borderColor: "var(--ink)", background: "var(--cream)" }}
              >
                <span
                  className="shrink-0 rounded-md px-2 py-1 text-xs font-black"
                  style={{ background: "var(--ink)", color: "var(--cream)" }}
                >
                  {m.t}
                </span>
                <span className="text-base">{m.text}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* 4. Decisions / Changes */}
        <Section title="Decisions / Changes" number={4} color="var(--sage)" tilt={-0.3}>
          <div className="grid gap-3 sm:grid-cols-3">
            {MOCK.decisions.map((d, i) => (
              <div
                key={i}
                className="rounded-xl border-2 p-4 text-sm font-semibold"
                style={{
                  borderColor: "var(--ink)",
                  background: "var(--paper)",
                  boxShadow: "3px 3px 0 0 var(--ink)",
                }}
              >
                <div
                  className="mb-2 inline-block rounded-full border-2 px-2 py-0.5 text-[10px] font-black uppercase"
                  style={{ borderColor: "var(--ink)", background: "var(--marigold)" }}
                >
                  Decision {i + 1}
                </div>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 5. What Matters To You */}
        <Section title="What Matters To You" number={5} color="var(--peach)" tilt={0.5}>
          <div className="space-y-3">
            {MOCK.matters.map((m, i) => (
              <div
                key={i}
                className="relative rounded-2xl border-2 p-4"
                style={{
                  borderColor: "var(--ink)",
                  background: "var(--cream)",
                }}
              >
                <span
                  className="absolute -left-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-black"
                  style={{
                    borderColor: "var(--ink)",
                    background: "var(--coral)",
                    color: "var(--cream)",
                  }}
                >
                  ♥
                </span>
                <p className="text-base font-medium">{m}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 6. Action Items */}
        <Section title="Action Items / Next Steps" number={6} color="var(--teal)" tilt={-0.4}>
          <ol className="space-y-3">
            {MOCK.next.map((n, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl border-2 p-3"
                style={{ borderColor: "var(--ink)", background: "var(--paper)" }}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-black"
                  style={{
                    borderColor: "var(--ink)",
                    background: "var(--marigold)",
                  }}
                >
                  {i + 1}
                </span>
                <span className="pt-0.5 text-base font-medium">{n}</span>
              </li>
            ))}
          </ol>
        </Section>

        {/* 7. Final Memory Card */}
        <ComicPanel className="mb-8" bg="var(--ink)" tilt={0.6}>
          <div style={{ color: "var(--cream)" }}>
            <div className="mb-3 text-xs font-black uppercase tracking-widest" style={{ color: "var(--marigold)" }}>
              Final Memory Card
            </div>
            <p className="text-2xl font-bold leading-snug md:text-3xl">"{MOCK.memory}"</p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <StickerBadge color="var(--coral)">Keep</StickerBadge>
              <StickerBadge color="var(--sage)">Share</StickerBadge>
              <StickerBadge color="var(--marigold)">Re-read</StickerBadge>
            </div>
          </div>
        </ComicPanel>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/play"
            className="rounded-full border-2 px-5 py-2 text-sm font-semibold"
            style={{ borderColor: "var(--ink)", background: "transparent", color: "var(--ink)" }}
          >
            ← Back to event
          </Link>
          <Link
            to="/recap"
            className="rounded-full border-[3px] px-6 py-3 text-sm font-black uppercase tracking-wide"
            style={{
              background: "var(--coral)",
              color: "var(--cream)",
              borderColor: "var(--ink)",
              boxShadow: "4px 4px 0 0 var(--ink)",
            }}
          >
            Make another recap
          </Link>
        </div>
      </div>
    </RecapTheme>
  );
}

function Section({
  title,
  number,
  color,
  tilt = 0,
  children,
}: {
  title: string;
  number: number;
  color: string;
  tilt?: number;
  children: React.ReactNode;
}) {
  return (
    <ComicPanel className="mb-8" tilt={tilt}>
      <div className="mb-4 flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 text-base font-black"
          style={{ background: color, borderColor: "var(--ink)", color: "var(--ink)" }}
        >
          {number}
        </span>
        <h2 className="text-2xl font-black">{title}</h2>
      </div>
      {children}
    </ComicPanel>
  );
}
