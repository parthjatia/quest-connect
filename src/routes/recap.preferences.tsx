import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RecapTheme, ComicPanel, StickerBadge } from "@/components/recap/recap-theme";
import { loadPrefs, savePrefs, type RecapPrefs } from "@/lib/recap-store";

export const Route = createFileRoute("/recap/preferences")({
  head: () => ({
    meta: [
      { title: "Personalize your recap" },
      { name: "description", content: "Six quick questions tune the recap to how you learn." },
    ],
  }),
  component: PreferencesPage,
});

type Q = { key: keyof RecapPrefs; title: string; options: string[]; color: string };

const QUESTIONS: Q[] = [
  {
    key: "purpose",
    title: "What do you need this recap to do?",
    options: ["Catch me up fast", "Help me actually understand it", "Show me what to do next"],
    color: "var(--coral)",
  },
  {
    key: "flow",
    title: "How should the explanation flow?",
    options: ["Big picture first", "Step by step", "Through examples and analogies"],
    color: "var(--marigold)",
  },
  {
    key: "tone",
    title: "What tone keeps you engaged?",
    options: ["Clear and professional", "Friendly and simple", "Playful and energetic"],
    color: "var(--sage)",
  },
  {
    key: "world",
    title: "What visual world should it feel like?",
    options: ["Animated storybook", "Superhero comic", "Manga / anime-inspired"],
    color: "var(--teal)",
  },
  {
    key: "format",
    title: "What format would you enjoy most?",
    options: ["Comic panels", "Magazine / zine spread", "Collectible cards"],
    color: "var(--peach)",
  },
  {
    key: "intensity",
    title: "How visually intense should it be?",
    options: ["Calm and clean", "Balanced and expressive", "Bold and dramatic"],
    color: "var(--brown)",
  },
];

function PreferencesPage() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<RecapPrefs>({});

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  const allAnswered = QUESTIONS.every((q) => prefs[q.key]);

  const handleGenerate = () => {
    savePrefs(prefs);
    navigate({ to: "/recap/loading" });
  };

  return (
    <RecapTheme>
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8 flex items-center gap-3">
          <StickerBadge color="var(--marigold)">Step 2 of 3</StickerBadge>
          <StickerBadge color="var(--sage)">6 quick questions</StickerBadge>
        </div>

        <h1 className="mb-3 text-4xl font-black leading-tight md:text-5xl">
          Tune your{" "}
          <span style={{ background: "var(--peach)", padding: "0 8px", borderRadius: 8 }}>
            recap
          </span>
          .
        </h1>
        <p className="mb-10 text-lg" style={{ color: "var(--ink-soft)" }}>
          Pick what feels right. We'll shape every panel to match.
        </p>

        <div className="space-y-6">
          {QUESTIONS.map((q, idx) => (
            <ComicPanel key={q.key} tilt={idx % 2 === 0 ? -0.4 : 0.4}>
              <div className="mb-4 flex items-start gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black"
                  style={{
                    background: q.color,
                    borderColor: "var(--ink)",
                    color: "var(--ink)",
                  }}
                >
                  Q{idx + 1}
                </span>
                <h2 className="text-xl font-bold leading-snug">{q.title}</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {q.options.map((opt) => {
                  const active = prefs[q.key] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPrefs((p) => ({ ...p, [q.key]: opt }))}
                      className="rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-transform hover:-translate-y-0.5"
                      style={{
                        background: active ? q.color : "var(--cream)",
                        borderColor: "var(--ink)",
                        color: "var(--ink)",
                        boxShadow: active ? "3px 3px 0 0 var(--ink)" : "2px 2px 0 0 var(--ink)",
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </ComicPanel>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate({ to: "/recap" })}
            className="rounded-full border-2 px-5 py-2 text-sm font-semibold"
            style={{ borderColor: "var(--ink)", background: "transparent", color: "var(--ink)" }}
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!allAnswered}
            className="rounded-full border-[3px] px-7 py-3 text-base font-black uppercase tracking-wide transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: "var(--coral)",
              color: "var(--cream)",
              borderColor: "var(--ink)",
              boxShadow: "5px 5px 0 0 var(--ink)",
            }}
          >
            Generate my recap →
          </button>
        </div>
      </div>
    </RecapTheme>
  );
}
