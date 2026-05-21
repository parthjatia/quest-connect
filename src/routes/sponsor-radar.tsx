import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Floorplan } from "@/components/vibe-map/floorplan";
import {
  SPONSOR_GOALS, SPONSOR_TARGET_FILTERS, SponsorGoal, SponsorTargetFilter, EventZone,
} from "@/data/mockEventData";
import { useLiveAttendees } from "@/hooks/use-live-attendees";
import {
  aggregateSponsorZones, generateSponsorAction, generateSponsorQuest, SponsorQuest,
} from "@/lib/sponsorRadarEngine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sponsor-radar")({
  head: () => ({
    meta: [
      { title: "Sponsor Radar — Quey" },
      { name: "description", content: "Find the right audience clusters and launch better event touchpoints." },
    ],
  }),
  component: SponsorPage,
});

function SponsorPage() {
  const [goal, setGoal] = useState<SponsorGoal>("hiring");
  const [filters, setFilters] = useState<SponsorTargetFilter[]>(["technical builders", "sponsor-open attendees"]);
  const [selectedZone, setSelectedZone] = useState<EventZone | null>(null);
  const [launchedQuests, setLaunchedQuests] = useState<SponsorQuest[]>([]);

  const live = useLiveAttendees();
  const attendees = live.data?.attendees ?? [];

  const zones = useMemo(
    () => aggregateSponsorZones(attendees, goal, filters),
    [attendees, goal, filters],
  );

  const statusMessage = live.isLoading
    ? "Loading live attendee data..."
    : live.data?.source === "fallback"
      ? "Could not load cloud attendee data. Showing demo fallback."
      : live.data?.usedClientEnrichment
        ? "Live attendee data from cloud. Demo enrichment used for missing profile fields."
        : "Live attendee data from cloud.";
  const bestZone = zones[0] ?? null;
  const isManualSelection = selectedZone !== null;
  const focused = isManualSelection
    ? zones.find((z) => z.zone === selectedZone) ?? null
    : bestZone;
  const action = useMemo(
    () => (focused ? generateSponsorAction(focused, goal, filters) : null),
    [focused, goal, filters],
  );

  const hasLaunchedQuest = launchedQuests.length > 0;

  const floorplanZones = zones.map((z) => ({
    zone: z.zone,
    heatLevel: z.heatLevel,
    intensity: z.intensity,
    label: z.totalCount > 0 ? `${z.highFitCount}/${z.totalCount} · avg ${z.averageScore}` : "—",
  }));

  const totalHighFit = zones.reduce((s, z) => s + z.highFitCount, 0);
  const activeZones = zones.filter((z) => z.totalCount > 0).length;
  const boothVisits = 40 + totalHighFit * 3;
  const questCompletions = Math.round(boothVisits * 0.42);
  const conversion = boothVisits ? Math.round((questCompletions / boothVisits) * 100) : 0;

  const toggleFilter = (f: SponsorTargetFilter) =>
    setFilters((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  const handleLaunchQuest = () => {
    if (!focused) return;
    const quest = generateSponsorQuest(goal, filters, focused);
    if (!quest) return;
    setLaunchedQuests((cur) => [{ ...quest, id: `${quest.id}-${Date.now()}` }, ...cur]);
  };

  return (
    <div className="relative min-h-screen bg-neon-base text-foreground overflow-hidden">
      <ThreeBackground variant="radar-rings" accent="magenta" />
      <div className="relative z-10">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between text-sm">
          <Link to="/" className="font-semibold tracking-tight">Quey</Link>
          <span className="text-muted-foreground text-xs uppercase tracking-[0.2em]">Sponsor</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div className="rounded-3xl bg-swoosh-3 p-8 sm:p-10">
          <p className="wrapped-kicker text-white/90 mb-3">Sponsor Radar</p>
          <h1 className="wrapped-headline-md text-white">Where is your audience right now?</h1>
          <p className="text-sm text-white/85 mt-3 max-w-2xl">
            Privacy-safe attendee clusters by zone. Sponsor-open people only show by name when they opt in.
          </p>
          <p className={cn(
            "text-[11px] mt-3 max-w-2xl leading-relaxed",
            live.data?.source === "fallback" ? "text-warning-foreground/90" : "text-white/70",
          )}>
            {statusMessage}
          </p>
        </div>


        <div className="grid gap-px bg-border border border-border sm:grid-cols-5">
          <Stat label="High-fit attendees" value={String(totalHighFit)} />
          <Stat label="Active zones" value={`${activeZones}/8`} />
          <Stat label="Booth visits" value={String(boothVisits)} />
          <Stat label="Quest completions" value={String(questCompletions)} />
          <Stat label="Heatmap → quest" value={`${conversion}%`} />
        </div>

        <div className="border border-border bg-card p-4 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Sponsor goal</p>
            <div className="flex flex-wrap gap-1.5">
              {SPONSOR_GOALS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
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
                    onClick={() => toggleFilter(f)}
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
                  onClick={() => setFilters([])}
                  className="text-xs px-2.5 py-1 text-muted-foreground hover:text-foreground"
                >
                  clear
                </button>
              )}
            </div>
          </div>
        </div>

        {live.isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading live attendee data...</p>
        ) : (
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-2">
            <Floorplan
              zones={floorplanZones}
              selectedZone={selectedZone}
              bestZone={bestZone?.zone ?? null}
              onSelectZone={(z) => setSelectedZone(z === selectedZone ? null : z)}
            />
            <p className="text-[11px] text-muted-foreground/80">
              Zone-level only. No GPS. No exact seats.
            </p>
          </div>

          <div className="border border-border bg-card p-5 space-y-4">
            {focused && focused.totalCount > 0 ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-lime">
                    {isManualSelection ? "Selected zone" : "Best sponsor move"}
                  </p>
                  {isManualSelection && (
                    <button
                      type="button"
                      onClick={() => setSelectedZone(null)}
                      className="text-[11px] text-lime hover:underline shrink-0"
                    >
                      Back to best zone
                    </button>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold">{focused.zone}</h3>
                  <dl className="mt-3 space-y-2 text-sm">
                    <MetricRow label="Total sponsor opportunity" value={String(focused.totalScore)} />
                    <MetricRow label="High-fit attendees" value={String(focused.highFitCount)} />
                    <MetricRow label="Average fit score" value={String(focused.averageScore)} />
                  </dl>
                  {!isManualSelection && (
                    <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                      Best zone is based on total sponsor opportunity: fit score × number of relevant attendees.
                      {focused.anonymousCount > 0 && ` Includes ${focused.anonymousCount} anonymous in the heat.`}
                    </p>
                  )}
                  {isManualSelection && focused.anonymousCount > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {focused.anonymousCount} anonymous included in zone heat only.
                    </p>
                  )}
                </div>

                {action && (
                  <div className="space-y-2">
                    <ActionLine label="Recommended" text={action.recommended} />
                    <ActionLine label="Booth activation" text={action.boothActivation} />
                    <ActionLine label="Quest idea" text={action.questIdea} />
                    <p className="text-[11px] text-muted-foreground pt-1">{action.why}</p>
                  </div>
                )}

                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
                    Sponsor-open people here
                  </p>
                  {focused.visibleMatches.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No sponsor-open attendees match this segment yet. Anonymous heat may still be shown.
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

                <div className="border-t border-border pt-3">
                  <Button onClick={handleLaunchQuest} className="w-full">
                    {hasLaunchedQuest ? "Launch another sponsor quest" : "Launch a sponsor quest"}
                  </Button>
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
        )}

        {launchedQuests.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Launched sponsor quests</p>
            <div className="space-y-2">
              {launchedQuests.map((q) => (
                <div key={q.id} className="border border-lime/40 bg-lime/5 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold">{q.title}</p>
                    <span className="text-[10px] uppercase tracking-[0.15em] text-lime shrink-0">{q.status}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{q.description}</p>
                  <dl className="grid gap-1.5 text-[11px] sm:grid-cols-2">
                    <QuestDetail label="Target zone" value={q.zone} />
                    <QuestDetail label="Sponsor goal" value={q.goal} />
                    <QuestDetail
                      label="Target audience"
                      value={q.targetFilters.length ? q.targetFilters.join(", ") : "All attendees in zone"}
                    />
                    <QuestDetail label="Reward points" value={String(q.rewardPoints)} />
                  </dl>
                  <p className="text-xs text-foreground pt-1">{q.ctaText}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Audience clusters by zone</p>
          <div className="grid gap-px bg-border border border-border sm:grid-cols-2 lg:grid-cols-4">
            {zones.map((z) => (
              <button
                key={z.zone}
                onClick={() => setSelectedZone(z.zone === selectedZone ? null : z.zone)}
                className={cn(
                  "bg-background p-3 text-left hover:bg-card transition-colors",
                  selectedZone === z.zone && "bg-card ring-1 ring-inset ring-lime/50",
                  bestZone?.zone === z.zone && selectedZone !== z.zone && "ring-1 ring-inset ring-lime/25",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{z.zone}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {bestZone?.zone === z.zone && (
                      <span className="text-[9px] uppercase tracking-wider text-lime">best</span>
                    )}
                    <span className="text-xs text-muted-foreground tabular-nums">{z.totalScore}</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {z.highFitCount} high-fit · avg {z.averageScore} · {z.totalCount} total
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
          Privacy: zone-level aggregation only. Names visible only for attendees who set themselves as visible <em>and</em> open to sponsors.
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

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function QuestDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground capitalize">{value}</dd>
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
