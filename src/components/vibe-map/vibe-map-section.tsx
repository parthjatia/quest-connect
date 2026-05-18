import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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

  const hottest = zones[0];
  const action = useMemo(() => generateAttendeeSuggestedAction(hottest, filters), [hottest, filters]);
  const focused = selectedZone ? zones.find((z) => z.zone === selectedZone) ?? null : hottest;

  const floorplanZones = zones.map((z) => ({
    zone: z.zone,
    heatLevel: z.heatLevel,
    intensity: z.intensity,
    label: z.matchingCount > 0 ? `${z.matchingCount} · ${z.averageScore}` : "—",
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

      {/* Filters */}
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
        <Floorplan
          zones={floorplanZones}
          selectedZone={selectedZone}
          onSelectZone={(z) => setSelectedZone(z === selectedZone ? null : z)}
          youZone={myZone}
        />

        {/* Hottest zone panel */}
        <div className="border border-border bg-card p-5 space-y-4">
          {focused && focused.matchingCount > 0 ? (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-lime">Best move right now</p>
                <h3 className="text-lg font-semibold mt-1">{focused.zone}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {focused.matchingCount} matching · avg score {focused.averageScore}
                  {focused.anonymousCount > 0 && ` · ${focused.anonymousCount} anonymous`}
                </p>
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

      {/* All zones grid */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">All zones</p>
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
                <HeatPill heat={z.heatLevel} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {z.matchingCount} match · avg {z.averageScore}
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

function HeatPill({ heat }: { heat: "cold" | "warm" | "hot" | "very-hot" }) {
  const styles: Record<typeof heat, string> = {
    "very-hot": "bg-destructive/30 text-destructive-foreground",
    "hot":      "bg-warning/40 text-warning-foreground",
    "warm":     "bg-warning/20 text-warning-foreground",
    "cold":     "bg-secondary text-muted-foreground",
  } as const;
  return <span className={cn("text-[9px] uppercase tracking-wider px-1.5 py-0.5", styles[heat])}>{heat}</span>;
}
