import { useMemo } from "react";

type Variant = "coin-rain" | "ambient" | "dense";

type Shape = {
  kind: "blob" | "ring" | "arc";
  size: number; // vmax units
  left: number; // %
  top: number; // %
  anim: string;
  delay: number;
  duration: number;
  opacity: number;
  rotate: number;
};

const SHAPE_KINDS: Shape["kind"][] = ["blob", "ring", "arc"];

export function FloatingDecor({
  variant = "ambient",
  density,
  className = "",
}: {
  variant?: Variant;
  density?: number;
  className?: string;
}) {
  const shapes = useMemo<Shape[]>(() => {
    const baseCount = variant === "ambient" ? 2 : 3;
    const count = Math.min(Math.max(density ?? baseCount, 2), 3);
    const drifts = ["animate-drift-a", "animate-drift-b", "animate-drift-c"];
    const positions = [
      { left: 12, top: 18 },
      { left: 72, top: 62 },
      { left: 42, top: 80 },
    ];
    return Array.from({ length: count }, (_, i) => ({
      kind: SHAPE_KINDS[i % SHAPE_KINDS.length],
      size: 38 + i * 10,
      left: positions[i].left,
      top: positions[i].top,
      anim: drifts[i % drifts.length],
      delay: -(i * 4.5),
      duration: 26 + i * 6,
      opacity: 0.06,
      rotate: i * 35,
    }));
  }, [variant, density]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden text-white ${className}`}
    >
      {shapes.map((s, idx) => (
        <div
          key={idx}
          className={`absolute ${s.anim}`}
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}vmax`,
            height: `${s.size}vmax`,
            transform: `translate(-50%, -50%) rotate(${s.rotate}deg)`,
            opacity: s.opacity,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        >
          <ShapeSvg kind={s.kind} />
        </div>
      ))}
    </div>
  );
}

function ShapeSvg({ kind }: { kind: Shape["kind"] }) {
  if (kind === "blob") {
    return (
      <svg viewBox="0 0 200 200" className="w-full h-full" fill="currentColor">
        <path d="M44.5,-58.6C56.6,-49.1,64.5,-34,68.7,-18.2C72.9,-2.4,73.5,14,67.1,27.5C60.7,41,47.4,51.5,32.6,59.2C17.8,66.9,1.6,71.7,-14.6,69.9C-30.7,68.1,-46.8,59.6,-57.5,46.7C-68.3,33.8,-73.7,16.4,-72.6,-0.7C-71.5,-17.7,-63.8,-33.6,-52.4,-43.7C-40.9,-53.8,-25.8,-58.1,-10.2,-60.3C5.3,-62.5,32.4,-68.1,44.5,-58.6Z" transform="translate(100 100)" />
      </svg>
    );
  }
  if (kind === "ring") {
    return (
      <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="100" cy="100" r="80" />
        <circle cx="100" cy="100" r="55" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M20,140 C60,40 140,40 180,140" />
      <path d="M40,160 C80,80 120,80 160,160" />
    </svg>
  );
}
