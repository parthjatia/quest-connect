import { ReactNode } from "react";

export function AnimatedHeadline({
  children,
  className = "",
  stagger = 35,
}: {
  children: string;
  className?: string;
  stagger?: number;
}) {
  const text = String(children ?? "");
  const letters = Array.from(text);
  return (
    <span className={`inline-block ${className}`} aria-label={text}>
      {letters.map((ch, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="inline-block animate-letter-pop"
          style={{
            animationDelay: `${i * stagger}ms`,
            animationFillMode: "both",
            whiteSpace: ch === " " ? "pre" : undefined,
          }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

export function ShimmerText({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`animate-text-shimmer ${className}`}>{children}</span>;
}
