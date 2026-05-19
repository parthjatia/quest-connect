import { EVENT_ZONES, EventZone, ZONE_LAYOUT } from "@/data/mockEventData";
import type { HeatLevel } from "@/lib/vibeMapEngine";
import { cn } from "@/lib/utils";

export type FloorplanZone = {
  zone: EventZone;
  label?: string;     // shown in the box (e.g. "12 · avg 67")
  intensity: number;  // 0–1
  heatLevel: HeatLevel;
};

type Props = {
  zones: FloorplanZone[];
  selectedZone?: EventZone | null;
  bestZone?: EventZone | null;
  onSelectZone?: (z: EventZone) => void;
  youZone?: EventZone | null;
};

// Map heat -> color (semantic via lime + warning + destructive tokens)
function heatColor(h: HeatLevel, intensity: number) {
  // Use rgba layers on top of card. We use inline style with oklch via CSS color-mix is not available everywhere,
  // so use direct oklch fills.
  switch (h) {
    case "very-hot": return `oklch(0.7 0.22 25 / ${0.35 + intensity * 0.5})`;     // red-orange
    case "hot":      return `oklch(0.78 0.2 50 / ${0.3 + intensity * 0.45})`;     // orange
    case "warm":     return `oklch(0.85 0.18 85 / ${0.25 + intensity * 0.4})`;    // yellow
    case "cold":     return `oklch(0.55 0.05 240 / 0.15)`;                        // blue-grey
  }
}

export function Floorplan({ zones, selectedZone, bestZone, onSelectZone, youZone }: Props) {
  const byZone = new Map(zones.map((z) => [z.zone, z]));
  return (
    <div className="border border-border bg-card p-3">
      <div className="relative w-full" style={{ aspectRatio: "100 / 62" }}>
        <svg viewBox="0 0 100 62" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          {/* room outline */}
          <rect x="1" y="1" width="98" height="60" fill="none" stroke="oklch(0.25 0.005 250)" strokeWidth="0.3" />
          {EVENT_ZONES.map((z) => {
            const layout = ZONE_LAYOUT[z];
            const data = byZone.get(z);
            const fill = data ? heatColor(data.heatLevel, data.intensity) : heatColor("cold", 0);
            const isSelected = selectedZone === z;
            const isBest = bestZone === z && !isSelected;
            const isYou = youZone === z;
            return (
              <g key={z} onClick={() => onSelectZone?.(z)} className={onSelectZone ? "cursor-pointer" : ""}>
                <rect
                  x={layout.x} y={layout.y} width={layout.w} height={layout.h}
                  fill={fill}
                  stroke={
                    isSelected
                      ? "oklch(0.9 0.22 130)"
                      : isBest
                        ? "oklch(0.9 0.22 130 / 0.55)"
                        : "oklch(0.35 0.005 250)"
                  }
                  strokeWidth={isSelected ? 0.5 : isBest ? 0.35 : 0.2}
                  strokeDasharray={isBest ? "1.2 0.8" : undefined}
                  rx="0.8"
                />
                <text
                  x={layout.x + layout.w / 2}
                  y={layout.y + layout.h / 2 - 0.4}
                  textAnchor="middle"
                  fontSize="1.8"
                  fill="oklch(0.98 0.003 250)"
                  fontWeight="600"
                >
                  {z}
                </text>
                {data?.label && (
                  <text
                    x={layout.x + layout.w / 2}
                    y={layout.y + layout.h / 2 + 2}
                    textAnchor="middle"
                    fontSize="1.5"
                    fill="oklch(0.85 0.003 250)"
                  >
                    {data.label}
                  </text>
                )}
                {isYou && (
                  <circle
                    cx={layout.x + 2}
                    cy={layout.y + 2}
                    r="0.9"
                    fill="oklch(0.9 0.22 130)"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        <Legend swatch="oklch(0.7 0.22 25 / 0.8)" label="very hot" />
        <Legend swatch="oklch(0.78 0.2 50 / 0.7)" label="hot" />
        <Legend swatch="oklch(0.85 0.18 85 / 0.6)" label="warm" />
        <Legend swatch="oklch(0.55 0.05 240 / 0.3)" label="cold" />
        {bestZone && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm border border-dashed border-lime/70" />
            best zone
          </span>
        )}
        {youZone && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-lime" />
            you
          </span>
        )}
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("inline-block h-2 w-3 rounded-sm")} style={{ background: swatch }} />
      {label}
    </span>
  );
}
