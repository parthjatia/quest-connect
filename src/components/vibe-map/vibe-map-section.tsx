import { useMemo, useState } from "react";

import { Floorplan } from "@/components/vibe-map/floorplan";
import {
  ATTENDEE_FILTERS, AttendeeFilter, CURRENT_USER, EVENT_ZONES, EventZone, MOCK_ATTENDEES,
} from "@/data/mockEventData";
import {
  aggregateVibeMapZones, generateAttendeeSuggestedAction,
} from "@/lib/vibeMapEngine";
import { cn } from "@/lib/utils";

export function VibeMapSection() {
  const [filters, setFilters] = useState<AttendeeFilter[]>(["startups", "AI"]);
  const [myZone, setMyZone] = useState<EventZone>(CURRENT_USER.currentZone);
  const [selectedZone, setSelectedZone] = useState<EventZone | null>(null);

  const me = useMemo(() => ({ ...CURRENT_USER, currentZone: myZone }), [myZone]);

  const zones = useMemo(
    () => aggregateVibeMapZones(me, MOCK_ATTENDEES, filters),
    [me, filters],
  );

  const bestZone = zones[0] ?? null;
  const isManualSelection = selectedZone !== null;
  const focused = isManualSelection
    ? zones.find((z) => z.zone === selectedZone) ?? null
    : bestZone;
  const action = useMemo(
    () => (focused ? generateAttendeeSuggestedAction(focused, filters) : null),
    [focused, filters],
  );

  const floorplanZones = zones.map((z) => ({
    zone: z.zone,
    heatLevel: z.heatLevel,
    intensity: z.intensity,
    label: z.matchingCount > 0 ? `${z.matchingCount} · avg ${z.averageScore}` : "—",
  }));

  const toggleFilter = (f: AttendeeFilter) =>
    setFilters((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-lime">Vibe Map</p>
          <h2 className="text-xl font-semibold tracking-tight">Where should I go?</h2>
          <p className="text-sm text-muted-foreground mt-1">Heatmap of people who match your filters, zone by zone.</p>
          <p className="text-[11px] text-muted-foreground/70 mt-2 max-w-xl leading-relaxed">
            Demo data shown. In production this connects to attendee check-ins, quest activity, and sponsor interactions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">I'm here now</label>
          <select
            value={myZone}
            onChange={(e) => setMyZone(e.target.value as EventZone)}
            className="bg-background border border-border text-sm px-2 py-1.5 text-foreground"
          >
            {EVENT_ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
      </div>

      <div className="border border-border bg-card p-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Find my people · pick what you care about</p>
        <div className="flex flex-wrap gap-1.5">
          {ATTENDEE_FILTERS.map((f) => {
            const on = filters.includes(f);
            return (
              <button
                key={f}
                onClick={() => toggleFilter(f)}
                className={cn(
                  "text-xs px-2.5 py-1 border transition-colors rounded-sm",
                  on
                    ? "bg-lime text-primary-foreground border-lime"
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

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-2">
          <Floorplan
            zones={floorplanZones}
            selectedZone={selectedZone}
            bestZone={bestZone?.zone ?? null}
            onSelectZone={(z) => setSelectedZone(z === selectedZone ? null : z)}
            youZone={myZone}
          />
          <p className="text-[11px] text-muted-foreground/80">
            Zone-level only. No GPS. No exact seats.
          </p>
        </div>

        <div className="border border-border bg-card p-5 space-y-4">
          {focused && focused.matchingCount > 0 ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-lime">
                  {isManualSelection ? "Selected zone" : "Best move right now"}
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
                  <MetricRow label="Total match strength" value={String(focused.totalScore)} />
                  <MetricRow label="Matching people" value={String(focused.matchingCount)} />
                  <MetricRow label="Average score" value={String(focused.averageScore)} />
                </dl>
                {!isManualSelection && (
                  <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                    Best because this zone has the strongest combined match strength, not just the highest average.
                    {focused.anonymousCount > 0 && ` Includes ${focused.anonymousCount} anonymous in the heat.`}
                  </p>
                )}
                {isManualSelection && focused.anonymousCount > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {focused.anonymousCount} anonymous included in zone heat only.
                  </p>
                )}
              </div>

              {focused.topSharedTags.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Strongest shared</p>
                  <div className="flex flex-wrap gap-1.5">
                    {focused.topSharedTags.map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 border border-border text-muted-foreground">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Top matches there</p>
                {focused.topMatches.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Only anonymous people in this zone. The heat is real, the names are private.</p>
                ) : (
                  <ul className="space-y-2">
                    {focused.topMatches.map((m) => (
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
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">↳ {m.matchedReasons[0]}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {action && (
                <div className="border-t border-border pt-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Say this when you get there</p>
                  <p className="text-sm italic">"{action.openingLine}"</p>
                  <p className="text-[11px] text-muted-foreground">{action.why}</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">No strong matches yet.</p>
              <p>Try removing one filter, or update your zone to see what's around you.</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">All zones</p>
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
                  <HeatPill heat={z.heatLevel} />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {z.matchingCount} match · avg {z.averageScore} · strength {z.totalScore}
                {z.anonymousCount > 0 && ` · ${z.anonymousCount} anon`}
              </p>
              {z.topSharedTags.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1.5 truncate">
                  {z.topSharedTags.join(" · ")}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
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

function HeatPill({ heat }: { heat: "cold" | "warm" | "hot" | "very-hot" }) {
  const styles: Record<typeof heat, string> = {
    "very-hot": "bg-destructive/30 text-destructive-foreground",
    "hot":      "bg-warning/40 text-warning-foreground",
    "warm":     "bg-warning/20 text-warning-foreground",
    "cold":     "bg-secondary text-muted-foreground",
  } as const;
  return <span className={cn("text-[9px] uppercase tracking-wider px-1.5 py-0.5", styles[heat])}>{heat}</span>;
}
