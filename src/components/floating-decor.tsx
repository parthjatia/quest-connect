import { useMemo } from "react";

import coinCyan from "@/assets/coin-cyan.png";
import coinNavy from "@/assets/coin-navy.png";
import diceRed from "@/assets/dice-red.png";
import diceBlack from "@/assets/dice-black.png";
import joystick from "@/assets/joystick.png";
import cassette from "@/assets/cassette.png";
import starBurst from "@/assets/star-burst.png";
import diamondGem from "@/assets/diamond-gem.png";

type Variant = "coin-rain" | "ambient" | "dense";

const COINS = [coinCyan, coinNavy];
const PROPS = [diceRed, diceBlack, joystick, cassette, starBurst, diamondGem];

// Stable pseudo-random based on seed index — no hydration mismatch.
function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export function FloatingDecor({
  variant = "ambient",
  density,
  className = "",
}: {
  variant?: Variant;
  density?: number;
  className?: string;
}) {
  const sprites = useMemo(() => {
    const counts: Record<Variant, number> = { "coin-rain": 14, ambient: 9, dense: 18 };
    const count = density ?? counts[variant];
    return Array.from({ length: count }, (_, i) => {
      const r1 = rand(i + 1);
      const r2 = rand(i + 101);
      const r3 = rand(i + 1001);
      const r4 = rand(i + 7777);
      const isCoin = variant === "coin-rain" ? true : variant === "dense" ? r4 > 0.45 : r4 > 0.7;
      const src = isCoin
        ? COINS[Math.floor(r3 * COINS.length)]
        : PROPS[Math.floor(r3 * PROPS.length)];
      const size = 28 + Math.floor(r2 * 52);
      const left = Math.floor(r1 * 100);
      const top = Math.floor(r2 * 100);
      const delay = -(r3 * 18).toFixed(2);
      const duration = 8 + Math.floor(r1 * 14);
      const anim =
        variant === "coin-rain"
          ? "animate-coin-fall"
          : ["animate-drift-a", "animate-drift-b", "animate-drift-c"][i % 3];
      const opacity = variant === "coin-rain" ? 0.7 + r2 * 0.25 : 0.12 + r2 * 0.18;
      return { i, src, size, left, top, delay, duration, anim, opacity };
    });
  }, [variant, density]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {sprites.map((s) => (
        <img
          key={s.i}
          src={s.src}
          alt=""
          loading="lazy"
          decoding="async"
          className={`absolute ${s.anim}`}
          style={{
            left: `${s.left}%`,
            top: variant === "coin-rain" ? `-${20 + s.i * 6}%` : `${s.top}%`,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            filter: variant === "coin-rain" ? "drop-shadow(0 8px 18px rgba(251, 191, 36, 0.45))" : "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
          }}
        />
      ))}
    </div>
  );
}
