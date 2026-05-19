import { useState } from "react";

import { EVENT_ZONES, EventZone, ZONE_LAYOUT } from "@/data/mockEventData";
import type { HeatLevel } from "@/lib/vibeMapEngine";
import { cn } from "@/lib/utils";

export type FloorplanZone = {
  zone: EventZone;
  label?: string;
  intensity: number;
  heatLevel: HeatLevel;
};

type Props = {
  zones: FloorplanZone[];
  selectedZone?: EventZone | null;
  bestZone?: EventZone | null;
  onSelectZone?: (z: EventZone) => void;
  youZone?: EventZone | null;
};

const INSET = 0.88;

function heatFill(h: HeatLevel, intensity: number) {
  const a = 0.22 + intensity * 0.55;
  switch (h) {
    case "very-hot": return `oklch(0.72 0.24 25 / ${a})`;
    case "hot":      return `oklch(0.8 0.2 55 / ${a * 0.9})`;
    case "warm":     return `oklch(0.86 0.16 90 / ${a * 0.75})`;
    case "cold":     return `oklch(0.42 0.04 250 / 0.35)`;
  }
}

function heatGlow(h: HeatLevel, intensity: number) {
  if (h === "cold") return "oklch(0.5 0.06 250 / 0.12)";
  const a = 0.25 + intensity * 0.45;
  switch (h) {
    case "very-hot": return `oklch(0.75 0.28 25 / ${a})`;
    case "hot":      return `oklch(0.82 0.22 55 / ${a})`;
    case "warm":     return `oklch(0.88 0.18 90 / ${a * 0.85})`;
    default:         return `oklch(0.5 0.06 250 / 0.12)`;
  }
}

function bubbleRect(layout: { x: number; y: number; w: number; h: number }) {
  const w = layout.w * INSET;
  const h = layout.h * INSET;
  const x = layout.x + (layout.w - w) / 2;
  const y = layout.y + (layout.h - h) / 2;
  const rx = Math.min(w, h) * 0.42;
  return { x, y, w, h, rx };
}

export function Floorplan({ zones, selectedZone, bestZone, onSelectZone, youZone }: Props) {
  const [hovered, setHovered] = useState<EventZone | null>(null);
  const byZone = new Map(zones.map((z) => [z.zone, z]));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-background to-card p-4 shadow-[inset_0_1px_0_0_oklch(1_0_0/0.06)]">
      <div
        className="pointer-events-none absolute -top-12 left-1/4 h-32 w-32 rounded-full bg-lime/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 right-1/4 h-28 w-28 rounded-full bg-warning/10 blur-3xl"
        aria-hidden
      />

      <div className="relative w-full" style={{ aspectRatio: "100 / 62" }}>
        <svg
          viewBox="0 0 100 62"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="vibe-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="1.8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="vibe-soft" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.6" />
            </filter>
          </defs>

          {/* Floor plate */}
          <rect
            x="2" y="2" width="96" height="58"
            rx="4" ry="4"
            fill="oklch(0.14 0.01 250 / 0.6)"
            stroke="oklch(0.28 0.01 250 / 0.5)"
            strokeWidth="0.25"
          />

          {EVENT_ZONES.map((z) => {
            const layout = ZONE_LAYOUT[z];
            const data = byZone.get(z);
            const heat = data?.heatLevel ?? "cold";
            const intensity = data?.intensity ?? 0;
            const { x, y, w, h, rx } = bubbleRect(layout);
            const cx = x + w / 2;
            const cy = y + h / 2;

            const isSelected = selectedZone === z;
            const isBest = bestZone === z && !isSelected;
            const isYou = youZone === z;
            const isHover = hovered === z;
            const active = isSelected || isHover;

            const scale = active ? 1.035 : 1;
            const glowR = Math.max(w, h) * 0.58;
            const transform = `translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`;

            return (
              <g
                key={z}
                className={cn(onSelectZone && "cursor-pointer")}
                onClick={() => onSelectZone?.(z)}
                onMouseEnter={() => setHovered(z)}
                onMouseLeave={() => setHovered(null)}
                transform={transform}
                style={{ transition: "transform 0.2s ease" }}
              >
                {heat !== "cold" && (
                  <ellipse
                    cx={cx}
                    cy={cy}
                    rx={glowR}
                    ry={glowR * 0.75}
                    fill={heatGlow(heat, intensity)}
                    filter="url(#vibe-soft)"
                  />
                )}

                {isBest && (
                  <rect
                    x={x - 0.5} y={y - 0.5}
                    width={w + 1} height={h + 1}
                    rx={rx + 0.5} ry={rx + 0.5}
                    fill="none"
                    stroke="oklch(0.9 0.22 130 / 0.5)"
                    strokeWidth="0.35"
                  >
                    <animate
                      attributeName="stroke-opacity"
                      values="0.25;0.65;0.25"
                      dur="2.5s"
                      repeatCount="indefinite"
                    />
                  </rect>
                )}

                <rect
                  x={x} y={y}
                  width={w} height={h}
                  rx={rx} ry={rx}
                  fill={heatFill(heat, intensity)}
                  stroke={
                    isSelected
                      ? "oklch(0.92 0.24 130)"
                      : isBest
                        ? "oklch(0.9 0.22 130 / 0.7)"
                        : isHover
                          ? "oklch(0.75 0.01 250 / 0.8)"
                          : "oklch(0.38 0.01 250 / 0.45)"
                  }
                  strokeWidth={isSelected ? 0.45 : isBest ? 0.3 : 0.2}
                  filter={heat !== "cold" ? "url(#vibe-glow)" : undefined}
                />

                <text
                  x={cx}
                  y={cy - (data?.label ? 0.9 : 0)}
                  textAnchor="middle"
                  fontSize="1.65"
                  fill="oklch(0.98 0.003 250)"
                  fontWeight="600"
                  className="pointer-events-none select-none"
                >
                  {z}
                </text>
                {data?.label && (
                  <text
                    x={cx}
                    y={cy + 2.1}
                    textAnchor="middle"
                    fontSize="1.35"
                    fill="oklch(0.82 0.01 250 / 0.9)"
                    className="pointer-events-none select-none"
                  >
                    {data.label}
                  </text>
                )}

                {isYou && (
                  <g transform={`translate(${x + 1.2}, ${y + 1.2})`}>
                    <circle r="1.35" fill="oklch(0.9 0.22 130)" />
                    <circle r="1.35" fill="none" stroke="oklch(0.12 0.01 250)" strokeWidth="0.2" />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        <LegendDot className="bg-[oklch(0.72_0.24_25)]" label="very hot" />
        <LegendDot className="bg-[oklch(0.8_0.2_55)]" label="hot" />
        <LegendDot className="bg-[oklch(0.86_0.16_90)]" label="warm" />
        <LegendDot className="bg-[oklch(0.42_0.04_250)]" label="quiet" />
        {bestZone && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-lime/60" />
            best zone
          </span>
        )}
        {youZone && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-lime shadow-[0_0_8px_oklch(0.9_0.22_130/0.8)]" />
            you
          </span>
        )}
        <span className="text-muted-foreground/60 normal-case tracking-normal text-[11px] ml-auto">
          Tap a bubble to explore
        </span>
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("inline-block h-2.5 w-2.5 rounded-full shadow-sm", className)} />
      {label}
    </span>
  );
}
