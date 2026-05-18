import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RecapTheme, ComicPanel } from "@/components/recap/recap-theme";

export const Route = createFileRoute("/recap/loading")({
  head: () => ({ meta: [{ title: "Building your recap…" }] }),
  component: LoadingPage,
});

const STEPS = [
  "Reading transcript",
  "Extracting key moments",
  "Choosing your story format",
  "Building your recap",
];

function LoadingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const ticks: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((_, i) => {
      ticks.push(setTimeout(() => setStep(i + 1), (i + 1) * 850));
    });
    const done = setTimeout(() => navigate({ to: "/recap/result" }), STEPS.length * 850 + 600);
    return () => {
      ticks.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [navigate]);

  return (
    <RecapTheme>
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16">
        <ComicPanel className="w-full text-center" bg="var(--paper)">
          <div className="mb-6 flex justify-center">
            <div
              className="h-16 w-16 animate-spin rounded-full border-[6px]"
              style={{
                borderColor: "var(--ink)",
                borderTopColor: "var(--coral)",
              }}
            />
          </div>
          <h1 className="mb-2 text-3xl font-black leading-tight md:text-4xl">
            Rewriting the event{" "}
            <span style={{ background: "var(--peach)", padding: "0 8px", borderRadius: 8 }}>
              through your lens
            </span>
            …
          </h1>
          <p className="mb-8 text-sm" style={{ color: "var(--ink-soft)" }}>
            Sit tight — your personal recap is being assembled.
          </p>

          <ul className="mx-auto max-w-md space-y-3 text-left">
            {STEPS.map((label, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li
                  key={label}
                  className="flex items-center gap-3 rounded-xl border-2 px-4 py-3"
                  style={{
                    background: done ? "var(--sage)" : active ? "var(--marigold)" : "var(--cream)",
                    borderColor: "var(--ink)",
                    opacity: i > step ? 0.7 : 1,
                  }}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-black"
                    style={{ borderColor: "var(--ink)", background: "var(--paper)" }}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className="text-sm font-semibold">{label}</span>
                  {active && <span className="ml-auto text-xs font-bold">working…</span>}
                </li>
              );
            })}
          </ul>
        </ComicPanel>
      </div>
    </RecapTheme>
  );
}
