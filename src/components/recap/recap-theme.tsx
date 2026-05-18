import { ReactNode } from "react";

/**
 * Wraps recap pages with a warm cream/zine palette that overrides the
 * app-wide dark theme tokens only inside the recap routes.
 */
export function RecapTheme({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen"
      style={{
        // warm zine palette
        ["--cream" as never]: "#fbf6ec",
        ["--paper" as never]: "#fff9ee",
        ["--ink" as never]: "#2b2118",
        ["--ink-soft" as never]: "#5a4a3c",
        ["--coral" as never]: "#ef6b53",
        ["--peach" as never]: "#f7b89a",
        ["--marigold" as never]: "#e9a23b",
        ["--sage" as never]: "#9bb88a",
        ["--teal" as never]: "#5fa3a0",
        ["--brown" as never]: "#7a4e2d",
        background: "#fbf6ec",
        color: "#2b2118",
        fontFamily:
          '"Space Grotesk", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      } as React.CSSProperties}
    >
      {/* subtle paper texture */}
      <div
        className="min-h-screen"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(122,78,45,0.06) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ComicPanel({
  children,
  className = "",
  tilt = 0,
  bg = "var(--paper)",
}: {
  children: ReactNode;
  className?: string;
  tilt?: number;
  bg?: string;
}) {
  return (
    <div
      className={`relative rounded-2xl border-[3px] border-[color:var(--ink)] p-6 ${className}`}
      style={{
        background: bg,
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
        boxShadow: "6px 6px 0 0 var(--ink)",
      }}
    >
      {children}
    </div>
  );
}

export function StickerBadge({
  children,
  color = "var(--coral)",
  className = "",
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border-2 border-[color:var(--ink)] px-3 py-1 text-xs font-bold uppercase tracking-wide ${className}`}
      style={{ background: color, color: "var(--ink)", boxShadow: "2px 2px 0 0 var(--ink)" }}
    >
      {children}
    </span>
  );
}
