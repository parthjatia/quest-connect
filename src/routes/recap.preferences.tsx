import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RecapShell } from "@/components/recap/recap-shell";
import { cn } from "@/lib/utils";
import { deriveTemplateId, loadPrefs, savePrefs, saveTemplateId, type RecapPrefs } from "@/lib/recap-store";

export const Route = createFileRoute("/recap/preferences")({
  head: () => ({
    meta: [
      { title: "Personalize your recap" },
      { name: "description", content: "Six quick questions tune the recap to how you learn." },
    ],
  }),
  component: PreferencesPage,
});

type Q = { key: keyof RecapPrefs; title: string; options: string[] };

const QUESTIONS: Q[] = [
  {
    key: "purpose",
    title: "What do you need this recap to do?",
    options: ["Catch me up fast", "Help me actually understand it", "Show me what to do next"],
  },
  {
    key: "flow",
    title: "How should the explanation flow?",
    options: ["Big picture first", "Step by step", "Through examples and analogies"],
  },
  {
    key: "tone",
    title: "What tone keeps you engaged?",
    options: ["Clear and professional", "Friendly and simple", "Playful and energetic"],
  },
  {
    key: "world",
    title: "What visual world should it feel like?",
    options: ["Animated storybook", "Superhero comic", "Manga / anime-inspired"],
  },
  {
    key: "format",
    title: "What format would you enjoy most?",
    options: ["Comic panels", "Magazine / zine spread", "Collectible cards"],
  },
  {
    key: "intensity",
    title: "How visually intense should it be?",
    options: ["Calm and clean", "Balanced and expressive", "Bold and dramatic"],
  },
];

function PreferencesPage() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<RecapPrefs>({});

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  const answered = QUESTIONS.filter((q) => prefs[q.key]).length;
  const allAnswered = answered === QUESTIONS.length;

  const handleGenerate = () => {
    savePrefs(prefs);
    saveTemplateId(deriveTemplateId(prefs));
    navigate({ to: "/recap/loading" });
  };

  return (
    <RecapShell>
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="uppercase tracking-wider">Step 2 of 3</Badge>
        <Badge className="bg-primary/15 text-primary border border-primary/30 hover:bg-primary/15">
          {answered} / {QUESTIONS.length} answered
        </Badge>
      </div>

      <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05] mb-3">
        Tune your <span className="text-lime">recap</span>.
      </h1>
      <p className="text-muted-foreground text-base mb-10 max-w-xl">
        Pick what feels right. We'll shape every panel to match how you learn.
      </p>

      <div className="space-y-5">
        {QUESTIONS.map((q, idx) => (
          <Card key={q.key}>
            <CardHeader>
              <CardTitle className="flex items-start gap-3 text-base">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground">
                  {idx + 1}
                </span>
                <span className="pt-0.5">{q.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-3">
                {q.options.map((opt) => {
                  const active = prefs[q.key] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPrefs((p) => ({ ...p, [q.key]: opt }))}
                      className={cn(
                        "group relative rounded-md border px-4 py-3 text-left text-sm transition-colors",
                        active
                          ? "border-lime bg-primary/10 text-foreground"
                          : "border-border bg-card hover:border-lime/50 hover:bg-accent/30 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span>{opt}</span>
                        {active && <Check className="h-4 w-4 text-lime" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => navigate({ to: "/recap" })}>
          ← Back
        </Button>
        <Button size="lg" disabled={!allAnswered} onClick={handleGenerate}>
          Generate my recap →
        </Button>
      </div>
    </RecapShell>
  );
}
