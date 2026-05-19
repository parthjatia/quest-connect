import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Floorplan } from "@/components/vibe-map/floorplan";
import {
  ATTENDEE_FILTERS, AttendeeFilter, Attendee, EVENT_ZONES, EventZone,
} from "@/data/mockEventData";
import {
  fetchAttendeeById,
  resolveDemoCurrentUser,
  updateAttendeeZone,
} from "@/lib/attendeeDataAdapter";
import { useLiveAttendees } from "@/hooks/use-live-attendees";
import { useVibeFilterSuggestions } from "@/hooks/use-vibe-filter-suggestions";
import type { VibeFilterSuggestResult } from "@/lib/vibeMap.functions";
import type { FilterSuggestion } from "@/lib/vibeFilterSuggestions";
import { getLocalAttendee } from "@/lib/local-attendee";
import {
  aggregateVibeMapZones, generateAttendeeSuggestedAction,
} from "@/lib/vibeMapEngine";
import { cn } from "@/lib/utils";

type Props = {
  currentAttendeeId?: string | null;
};

export function VibeMapSection({ currentAttendeeId }: Props) {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<AttendeeFilter[]>([]);
  const [showSuggestDebug, setShowSuggestDebug] = useState(false);
  const [selectedZone, setSelectedZone] = useState<EventZone | null>(null);
  const [myZone, setMyZone] = useState<EventZone>("Middle Left");
  const [zoneSaveError, setZoneSaveError] = useState<string | null>(null);
  const [isSavingZone, setIsSavingZone] = useState(false);

  const sessionId = currentAttendeeId ?? getLocalAttendee()?.id ?? null;

  const live = useLiveAttendees();

  const currentUserQuery = useQuery({
    queryKey: ["vibe-map-me", sessionId],
    enabled: !!sessionId && live.data?.source === "live",
    queryFn: () => fetchAttendeeById(sessionId!),
  });

  const { me, isDemoStandIn, pool, dataLabel } = useMemo(() => {
    const result = live.data;
    if (!result || live.isLoading) {
      return {
        me: null as Attendee | null,
        isDemoStandIn: false,
        pool: [] as Attendee[],
        dataLabel: "loading" as const,
      };
    }

    const attendees = result.attendees;
    const resolved = resolveDemoCurrentUser(
      attendees,
      sessionId,
      currentUserQuery.data ?? null,
    );

    const others = attendees.filter((a) => a.id !== resolved.user.id);
    const label =
      result.source === "fallback"
        ? "fallback"
        : result.usedClientEnrichment
          ? "live-enriched"
          : "live";

    return {
      me: resolved.user,
      isDemoStandIn: resolved.isDemoStandIn,
      pool: others,
      dataLabel: label as "live" | "live-enriched" | "fallback",
    };
  }, [live.data, live.isLoading, sessionId, currentUserQuery.data]);

  useEffect(() => {
    if (me) setMyZone(me.currentZone);
  }, [me?.id, me?.currentZone]);

  const meWithZone = useMemo(
    () => (me ? { ...me, currentZone: myZone } : null),
    [me, myZone],
  );

  const suggestions = useVibeFilterSuggestions(meWithZone, sessionId);

  const profileFilterKey = suggestions.profile.filters.join("|");

  useEffect(() => {
    if (!meWithZone || !sessionId || !profileFilterKey) return;
    const key = `vibe-filters-init-${sessionId}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(key)) return;
    setFilters(suggestions.profile.filters);
    if (typeof window !== "undefined") sessionStorage.setItem(key, "1");
  }, [meWithZone?.id, sessionId, profileFilterKey, suggestions.profile.filters]);

  const zones = useMemo(
    () => (meWithZone ? aggregateVibeMapZones(meWithZone, pool, filters) : []),
    [meWithZone, pool, filters],
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

  const applySuggestedFilters = (next: AttendeeFilter[], label: string) => {
    if (!next.length) {
      toast.message("No profile-based suggestions yet — pick filters manually.");
      return;
    }
    setFilters(next);
    toast.success(label);
  };

  const handleEnhanceWithAi = async () => {
    if (!sessionId) {
      toast.error("Join with your attendee code to use smart match.");
      return;
    }
    try {
      const result = await suggestions.fetchAi();
      if (!result) {
        toast.error(suggestions.aiError ?? "Smart match failed — profile suggestions still available.");
        return;
      }
      if (result.filters.length > 0) {
        setFilters(result.filters);
        toast.success(
          result.source === "profile+ai"
            ? "Applied smart match (profile + AI)."
            : "AI unavailable — applied profile filters only.",
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Smart match failed");
    }
  };

  const handleZoneChange = async (zone: EventZone) => {
    const prev = myZone;
    setMyZone(zone);
    setZoneSaveError(null);

    if (!sessionId || live.data?.source === "fallback") return;

    setIsSavingZone(true);
    const { ok, error } = await updateAttendeeZone(sessionId, zone);
    setIsSavingZone(false);

    if (!ok) {
      setMyZone(prev);
      const msg = error ?? "Could not save zone.";
      setZoneSaveError(msg);
      toast.error(msg);
    } else {
      void qc.invalidateQueries({ queryKey: ["live-attendees"] });
      void qc.invalidateQueries({ queryKey: ["vibe-map-me", sessionId] });
    }
  };

  const statusMessage = (() => {
    if (live.isLoading) return "Loading live attendee data...";
    if (live.data?.source === "fallback") {
      return "Could not load cloud attendee data. Showing demo fallback.";
    }
    if (dataLabel === "live-enriched") {
      return "Live attendee data from cloud. Demo enrichment used for missing profile fields.";
    }
    return "Live attendee data from cloud.";
  })();

  const emptyFilters = meWithZone && zones.every((z) => z.matchingCount === 0);
  const flowStep = !filters.length
    ? 0
    : focused && focused.matchingCount > 0
      ? 2
      : 1;

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-lime">Vibe Map</p>
          <h2 className="text-xl font-semibold tracking-tight">Where should I go?</h2>
          <p className="text-sm text-muted-foreground mt-1">Heatmap of people who match your filters, zone by zone.</p>
          <p className={cn(
            "text-[11px] mt-2 max-w-xl leading-relaxed",
            live.data?.source === "fallback" ? "text-warning-foreground/90" : "text-muted-foreground/70",
          )}>
            {statusMessage}
            {isDemoStandIn && live.data?.source === "live" && (
              <span className="block mt-1">Using a stand-in profile until you join with your attendee code.</span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">I'm here now</label>
            <select
              value={myZone}
              disabled={!meWithZone || isSavingZone}
              onChange={(e) => void handleZoneChange(e.target.value as EventZone)}
              className="bg-background border border-border text-sm px-2 py-1.5 text-foreground disabled:opacity-50"
            >
              {EVENT_ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          {zoneSaveError && (
            <p className="text-[10px] text-destructive">{zoneSaveError}</p>
          )}
        </div>
      </div>

      <VibeFlowSteps activeStep={flowStep} />

      <div className="rounded-2xl border border-border/70 bg-card/80 p-4 backdrop-blur-sm space-y-4">
        {meWithZone && suggestions.displayFilters.length > 0 && (
          <SuggestedFiltersPanel
            displayFilters={suggestions.displayFilters}
            activeFilters={filters}
            profileSuggestions={suggestions.profile.suggestions}
            aiResult={suggestions.aiResult}
            isAiLoading={suggestions.isAiLoading}
            aiError={suggestions.aiError}
            showDebug={showSuggestDebug}
            onToggleDebug={() => setShowSuggestDebug((v) => !v)}
            onToggleFilter={toggleFilter}
            onMatchProfile={() => applySuggestedFilters(
              suggestions.displayFilters,
              suggestions.aiResult?.source === "profile+ai"
                ? "Applied smart match filters"
                : "Applied filters from your profile",
            )}
            onEnhanceAi={() => void handleEnhanceWithAi()}
            canUseAi={!!sessionId && live.data?.source !== "fallback"}
          />
        )}
        <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Find my people · or fine-tune</p>
        <div className="flex flex-wrap gap-2">
          {ATTENDEE_FILTERS.map((f) => {
            const on = filters.includes(f);
            return (
              <button
                key={f}
                onClick={() => toggleFilter(f)}
                className={cn(
                  "text-xs px-3 py-1.5 border transition-all duration-200 rounded-full",
                  on
                    ? "bg-lime text-primary-foreground border-lime shadow-[0_0_12px_oklch(0.9_0.22_130/0.35)]"
                    : "border-border/80 text-muted-foreground hover:text-foreground hover:border-foreground/60 hover:bg-secondary/40",
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
        <>
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

            <div className="rounded-2xl border border-border/70 bg-card/90 p-5 space-y-4 shadow-sm">
              {emptyFilters ? (
                <div className="text-sm text-muted-foreground space-y-2">
                  <p className="font-semibold text-foreground">No attendees match these filters yet.</p>
                  <p>Try removing one filter.</p>
                </div>
              ) : focused && focused.matchingCount > 0 ? (
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

                  {focused && focused.zone !== myZone && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSavingZone || !meWithZone}
                      onClick={() => void handleZoneChange(focused.zone)}
                      className="w-full rounded-full border-lime/40 text-lime hover:bg-lime/10"
                    >
                      {isSavingZone ? "Saving…" : `I'm heading to ${focused.zone}`}
                    </Button>
                  )}

                  {action && (
                    <div className="rounded-xl border border-border/60 bg-secondary/20 p-3 space-y-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-lime">Step 3 · Your icebreaker</p>
                      <p className="text-sm italic leading-relaxed">"{action.openingLine}"</p>
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
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {zones.map((z) => (
                <button
                  key={z.zone}
                  onClick={() => setSelectedZone(z.zone === selectedZone ? null : z.zone)}
                  className={cn(
                    "rounded-xl border border-border/50 bg-background/80 p-3 text-left transition-all duration-200",
                    "hover:border-border hover:bg-card hover:shadow-md",
                    selectedZone === z.zone && "border-lime/50 bg-card shadow-[0_0_16px_oklch(0.9_0.22_130/0.15)]",
                    bestZone?.zone === z.zone && selectedZone !== z.zone && "border-lime/25",
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
        </>
      )}
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
  return <span className={cn("text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full", styles[heat])}>{heat}</span>;
}

const FLOW = ["Pick filters", "Read the map", "Go + say hi"] as const;

function SuggestedFiltersPanel({
  displayFilters,
  activeFilters,
  profileSuggestions,
  aiResult,
  isAiLoading,
  aiError,
  showDebug,
  onToggleDebug,
  onToggleFilter,
  onMatchProfile,
  onEnhanceAi,
  canUseAi,
}: {
  displayFilters: AttendeeFilter[];
  activeFilters: AttendeeFilter[];
  profileSuggestions: FilterSuggestion[];
  aiResult: VibeFilterSuggestResult | null;
  isAiLoading: boolean;
  aiError: string | null;
  showDebug: boolean;
  onToggleDebug: () => void;
  onToggleFilter: (f: AttendeeFilter) => void;
  onMatchProfile: () => void;
  onEnhanceAi: () => void;
  canUseAi: boolean;
}) {
  const reasonMap = new Map(
    (aiResult?.suggestions ?? profileSuggestions).map((s) => [s.filter, s.reason]),
  );

  return (
    <div className="rounded-xl border border-lime/25 bg-lime/5 p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-lime">Suggested for you</p>
        <span className="text-[10px] text-muted-foreground">
          {aiResult?.source === "profile+ai" ? "profile + AI" : "from your profile"}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {displayFilters.map((f) => {
          const on = activeFilters.includes(f);
          return (
            <button
              key={f}
              type="button"
              title={reasonMap.get(f)}
              onClick={() => onToggleFilter(f)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-all",
                on
                  ? "bg-lime/90 text-primary-foreground border-lime"
                  : "border-lime/30 text-lime hover:bg-lime/10",
              )}
            >
              {f}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" className="rounded-full h-8" onClick={onMatchProfile}>
          Match my profile
        </Button>
        {canUseAi && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full h-8 border-lime/40"
            disabled={isAiLoading}
            onClick={onEnhanceAi}
          >
            {isAiLoading ? "Smart match…" : "Enhance with AI"}
          </Button>
        )}
        <button
          type="button"
          onClick={onToggleDebug}
          className="text-[10px] text-muted-foreground hover:text-foreground self-center"
        >
          {showDebug ? "Hide debug" : "Debug"}
        </button>
      </div>

      {aiError && (
        <p className="text-[11px] text-warning-foreground/90">
          AI skipped: {aiError}. Profile suggestions still work.
        </p>
      )}

      {showDebug && (
        <details open className="text-[10px] text-muted-foreground space-y-2 border-t border-border/50 pt-2">
          <summary className="cursor-pointer">Suggestion debug</summary>
          <ul className="list-disc pl-4 space-y-0.5">
            {profileSuggestions.map((s) => (
              <li key={s.filter}><span className="text-foreground">{s.filter}</span> — {s.reason} (profile)</li>
            ))}
          </ul>
          {aiResult && (
            <pre className="mt-2 p-2 rounded bg-background/80 overflow-x-auto text-[9px] leading-relaxed">
              {JSON.stringify(aiResult.debug, null, 2)}
              {aiResult.debug.aiRaw ? `\n\nraw:\n${aiResult.debug.aiRaw}` : ""}
            </pre>
          )}
        </details>
      )}
    </div>
  );
}

function VibeFlowSteps({ activeStep }: { activeStep: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-[11px]">
      {FLOW.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          {i > 0 && <span className="text-muted-foreground/40">→</span>}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border transition-colors",
              i <= activeStep
                ? "border-lime/40 bg-lime/10 text-lime"
                : "border-border/50 text-muted-foreground",
            )}
          >
            <span className={cn(
              "grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold",
              i <= activeStep ? "bg-lime text-primary-foreground" : "bg-secondary",
            )}>
              {i + 1}
            </span>
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}
