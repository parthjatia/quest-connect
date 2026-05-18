import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { RecapShell } from "@/components/recap/recap-shell";
import { cn } from "@/lib/utils";

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
    <RecapShell>
      <div className="flex flex-col items-center justify-center py-12">
        <Card className="w-full max-w-xl">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mb-6 flex justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-lime" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
              Rewriting the event <span className="text-lime">through your lens</span>…
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              Sit tight — your personal recap is being assembled.
            </p>

            <ul className="space-y-2 text-left">
              {STEPS.map((label, i) => {
                const done = i < step;
                const active = i === step;
                return (
                  <li
                    key={label}
                    className={cn(
                      "flex items-center gap-3 rounded-md border px-4 py-3 transition-colors",
                      done && "border-lime/40 bg-primary/10",
                      active && "border-border bg-secondary",
                      !done && !active && "border-border bg-card opacity-60",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                        done
                          ? "border-lime bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span className="text-sm font-medium">{label}</span>
                    {active && (
                      <span className="ml-auto text-xs text-muted-foreground">working…</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </RecapShell>
  );
}
