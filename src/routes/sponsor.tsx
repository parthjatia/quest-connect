import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Floorplan } from "@/components/vibe-map/floorplan";
import {
  MOCK_ATTENDEES, SPONSOR_GOALS, SPONSOR_TARGET_FILTERS, SponsorGoal, SponsorTargetFilter, EventZone,
} from "@/data/mockEventData";
import {
  aggregateSponsorZones, generateSponsorAction, generateSponsorQuest, SponsorQuest,
} from "@/lib/sponsorRadarEngine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sponsor")({
  head: () => ({
    meta: [
      { title: "Sponsor Radar — Quest Connect" },
      { name: "description", content: "Find the right audience clusters and launch better event touchpoints." },
    ],
  }),
  component: SponsorPage,
});

function SponsorPage() {
  const [goal, setGoal] = useState<SponsorGoal>("hiring");
  const [filters, setFilters] = useState<SponsorTargetFilter[]>(["technical builders", "sponsor-open attendees"]);
  const [selectedZone, setSelectedZone] = useState<EventZone | null>(null);
  const [quest, setQuest] = useState<SponsorQuest | null>(null);

  const zones = useMemo(
    () => aggregateSponsorZones(MOCK_ATTENDEES, goal, filters),
    [goal, filters],
  );
  const hottest = zones[0] ?? null;
  const focused = selectedZone ? zones.find((z) => z.zone === selectedZone) ?? hottest : hottest;
  const action = useMemo(() => (focused ? generateSponsorAction(focused, goal, filters) : null), [focused, goal, filters]);

  // Active quest only shows when it still matches current selection
  const activeQuest = quest && quest.zone === focused?.zone && quest.goal === goal ? quest : null;

  const floorplanZones = zones.map((z) => ({
    zone: z.zone,
    heatLevel: z.heatLevel,
    intensity: z.intensity,
    label: z.totalCount > 0 ? `${z.highFitCount}/${z.totalCount} · ${z.averageScore}` : "—",
  }));

  // Engagement stats (deterministic mock derived from data)
  const totalHighFit = zones.reduce((s, z) => s + z.highFitCount, 0);
  const activeZones = zones.filter((z) => z.totalCount > 0).length;
  const boothVisits = 40 + totalHighFit * 3;
  const questCompletions = Math.round(boothVisits * 0.42);
  const conversion = boothVisits ? Math.round((questCompletions / boothVisits) * 100) : 0;

  const toggleFilter = (f: SponsorTargetFilter) =>
    setFilters((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between text-sm">
          <Link to="/" className="font-semibold tracking-tight">Quest Connect</Link>
          <span className="text-muted-foreground text-xs uppercase tracking-[0.2em]">Sponsor</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {/* Title */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-lime">Sponsor Radar</p>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">Where is your audience right now?</h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Privacy-safe attendee clusters by zone. No exact seats. No GPS. Sponsor-open people only show by name when they opt in.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid gap-px bg-border border border-border sm:grid-cols-5">
          <Stat label="High-fit attendees" value={String(totalHighFit)} />
          <Stat label="Active zones" value={`${activeZones}/8`} />
          <Stat label="Booth visits" value={String(boothVisits)} />
          <Stat label="Quest completions" value={String(questCompletions)} />
          <Stat label="Heatmap → quest" value={`${conversion}%`} />
        </div>

        {/* Goal + filters */}
        <div className="border border-border bg-card p-4 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Sponsor goal</p>
            <div className="flex flex-wrap gap-1.5">
              {SPONSOR_GOALS.map((g) => (
                <button
                  key={g}
                  onClick={() => { setGoal(g); setQuest(null); }}
                  className={cn(
                    "text-xs px-3 py-1.5 border rounded-sm transition-colors capitalize",
                    g === goal
                      ? "bg-lime text-primary-foreground border-lime"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground",
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Target audience filters</p>
            <div className="flex flex-wrap gap-1.5">
              {SPONSOR_TARGET_FILTERS.map((f) => {
                const on = filters.includes(f);
                return (
                  <button
                    key={f}
                    onClick={() => { toggleFilter(f); setQuest(null); }}
                    className={cn(
                      "text-xs px-2.5 py-1 border rounded-sm transition-colors",
                      on
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground",
                    )}
                  >
                    {f}
                  </button>
                );
              })}
              {filters.length > 0 && (
                <button
                  onClick={() => { setFilters([]); setQuest(null); }}
                  className="text-xs px-2.5 py-1 text-muted-foreground hover:text-foreground"
                >
                  clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Heatmap + action panel */}
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Floorplan
            zones={floorplanZones}
            selectedZone={selectedZone}
            onSelectZone={(z) => setSelectedZone(z === selectedZone ? null : z)}
          />

          <div className="border border-border bg-card p-5 space-y-4">
            {focused && focused.totalCount > 0 ? (
              <>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-lime">Best sponsor move</p>
                  <h3 className="text-lg font-semibold mt-1">{focused.zone}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {focused.highFitCount} high-fit · avg fit {focused.averageScore}
                    {focused.anonymousCount > 0 && ` · ${focused.anonymousCount} anonymous`}
                  </p>
                </div>

                {action && (
                  <div className="space-y-2">
                    <ActionLine label="Recommended" text={action.recommended} />
                    <ActionLine label="Booth activation" text={action.boothActivation} />
                    <ActionLine label="Quest idea" text={action.questIdea} />
                    <p className="text-[11px] text-muted-foreground pt-1">{action.why}</p>
                  </div>
                )}

                {/* Visible sponsor-open attendees */}
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
                    Sponsor-open people here
                  </p>
                  {focused.visibleMatches.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No sponsor-open attendees in this segment yet, but anonymous heat is still shown above.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {focused.visibleMatches.map((m) => (
                        <li key={m.attendee.id} className="flex items-start gap-3">
                          <div className="grid h-8 w-8 place-items-center bg-secondary text-xs font-semibold shrink-0">
                            {m.attendee.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium truncate">{m.attendee.name}</p>
                              <span className="text-xs text-lime font-semibold shrink-0">{m.score}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">{m.attendee.university} · {m.attendee.track}</p>
                            {m.matchedReasons[0] && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">↳ {m.matchedReasons.slice(0, 2).join(" · ")}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="border-t border-border pt-3 space-y-2">
                  <Button
                    onClick={() => setQuest(generateSponsorQuest(goal, filters, focused))}
                    className="w-full"
                  >
                    Launch a sponsor quest
                  </Button>
                  {activeQuest && (
                    <div className="border border-lime/40 bg-lime/5 p-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-lime">Generated quest</p>
                      <p className="text-sm font-semibold mt-1">{activeQuest.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{activeQuest.description}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground">This segment is quiet right now.</p>
                <p>Try removing one filter or switching sponsor goal.</p>
              </div>
            )}
          </div>
        </div>

        {/* Audience clusters table */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Audience clusters by zone</p>
          <div className="grid gap-px bg-border border border-border sm:grid-cols-2 lg:grid-cols-4">
            {zones.map((z) => (
              <button
                key={z.zone}
                onClick={() => setSelectedZone(z.zone === selectedZone ? null : z.zone)}
                className={cn(
                  "bg-background p-3 text-left hover:bg-card transition-colors",
                  selectedZone === z.zone && "bg-card",
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{z.zone}</p>
                  <span className="text-xs text-lime font-semibold">{z.averageScore}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {z.highFitCount} high-fit · {z.totalCount} total
                  {z.anonymousCount > 0 && ` · ${z.anonymousCount} anon`}
                </p>
                {z.dominantInterests.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1.5 truncate">
                    interests: {z.dominantInterests.join(" · ")}
                  </p>
                )}
                {z.dominantSkills.length > 0 && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    skills: {z.dominantSkills.join(" · ")}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Privacy: zone-level aggregation only. No exact seats. Names visible only for attendees who set themselves as visible <em>and</em> open to sponsors.
        </p>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-muted-foreground">
          Back to <Link to="/" className="text-lime hover:underline">home</Link>.
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background p-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function ActionLine({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="text-sm">{text}</p>
    </div>
  );
}
