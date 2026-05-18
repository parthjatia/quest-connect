import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RecapShell } from "@/components/recap/recap-shell";
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
    <RecapShell>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="uppercase tracking-wider">Your recap</Badge>
          {prefs.world && <Badge variant="outline">{prefs.world}</Badge>}
          {prefs.format && <Badge variant="outline">{prefs.format}</Badge>}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/recap">Start over</Link>
        </Button>
      </div>

      {/* Cover */}
      <Card className="mb-6 border-lime/40 bg-gradient-to-br from-primary/15 via-card to-card">
        <CardContent className="py-10 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-lime/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-lime">
            <Sparkles className="h-3 w-3" /> {MOCK.cover.tag}
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">
            {MOCK.cover.title}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
            {MOCK.cover.subtitle}
          </p>
        </CardContent>
      </Card>

      <Section title="Big Picture" number={2}>
        <p className="text-lg leading-snug">{MOCK.bigPicture}</p>
      </Section>

      <Section title="Key Moments" number={3}>
        <ul className="space-y-2">
          {MOCK.moments.map((m) => (
            <li
              key={m.t}
              className="flex gap-4 rounded-md border border-border bg-secondary/40 p-3"
            >
              <span className="shrink-0 rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                {m.t}
              </span>
              <span className="text-sm">{m.text}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Decisions / Changes" number={4}>
        <div className="grid gap-3 sm:grid-cols-3">
          {MOCK.decisions.map((d, i) => (
            <div key={i} className="rounded-md border border-border bg-secondary/40 p-4">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-lime">
                Decision {i + 1}
              </div>
              <p className="text-sm">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="What Matters To You" number={5}>
        <div className="space-y-3">
          {MOCK.matters.map((m, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-md border border-border bg-secondary/40 p-4"
            >
              <Heart className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
              <p className="text-sm">{m}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Action Items / Next Steps" number={6}>
        <ol className="space-y-2">
          {MOCK.next.map((n, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-md border border-border bg-secondary/40 p-3"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <span className="pt-0.5 text-sm">{n}</span>
            </li>
          ))}
        </ol>
      </Section>

      {/* Final Memory Card */}
      <Card className="mb-8 border-lime/40 bg-gradient-to-br from-card via-card to-primary/10">
        <CardContent className="py-8">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-lime">
            Final Memory Card
          </div>
          <p className="text-xl sm:text-2xl font-semibold leading-snug">"{MOCK.memory}"</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost">
          <Link to="/play">← Back to event</Link>
        </Button>
        <Button asChild>
          <Link to="/recap">Make another recap</Link>
        </Button>
      </div>
    </RecapShell>
  );
}

function Section({
  title,
  number,
  children,
}: {
  title: string;
  number: number;
  children: React.ReactNode;
}) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-base">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground">
            {number}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
