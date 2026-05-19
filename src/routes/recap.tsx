import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Upload, FileText, AlertCircle, Check, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RecapShell } from "@/components/recap/recap-shell";
import { RecapResult } from "@/components/recap/recap-result";
import {
  deriveTemplateId,
  loadPrefs,
  loadTranscript,
  savePrefs,
  saveTemplateId,
  saveTranscript,
  type RecapPrefs,
} from "@/lib/recap-store";
import { generatePersonalizedRecap, type RecapData } from "@/lib/recap-generator";
import { generateVisualRecap } from "@/lib/visual-recap.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/recap")({
  head: () => ({
    meta: [
      { title: "Personalized Visual Recap" },
      {
        name: "description",
        content: "Turn boring meeting notes or event transcripts into a personalized comic-style recap.",
      },
    ],
  }),
  component: RecapPage,
});

type Q = { key: keyof RecapPrefs; title: string; options: string[] };

const QUESTIONS: Q[] = [
  { key: "purpose", title: "What do you need this recap to do?", options: ["Catch me up fast", "Help me actually understand it", "Show me what to do next"] },
  { key: "flow", title: "How should the explanation flow?", options: ["Big picture first", "Step by step", "Through examples and analogies"] },
  { key: "tone", title: "What tone keeps you engaged?", options: ["Clear and professional", "Friendly and simple", "Playful and energetic"] },
  { key: "world", title: "What visual world should it feel like?", options: ["Animated storybook", "Superhero comic", "Manga / anime-inspired"] },
  { key: "format", title: "What format would you enjoy most?", options: ["Comic panels", "Magazine / zine spread", "Collectible cards"] },
  { key: "intensity", title: "How visually intense should it be?", options: ["Calm and clean", "Balanced and expressive", "Bold and dramatic"] },
];

const LOADING_STEPS = [
  "Reading transcript",
  "Extracting key moments",
  "Choosing your story format",
  "Building your recap",
];

function RecapPage() {
  const [text, setText] = useState("");
  const [prefs, setPrefs] = useState<RecapPrefs>({});
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<RecapData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(loadTranscript());
    setPrefs(loadPrefs());
  }, []);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const answered = QUESTIONS.filter((q) => prefs[q.key]).length;

  const handleFile = async (file: File | undefined) => {
    setUploadError(null);
    if (!file) return;
    const isTxt = file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");
    if (!isTxt) {
      setUploadError("TXT upload only for now — paste other formats as text.");
      return;
    }
    const content = await file.text();
    setText(content);
    setError(null);
  };

  const handleGenerate = async () => {
    setError(null);
    if (!text.trim()) {
      setError("Paste a transcript or upload a .txt file to continue.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (answered < QUESTIONS.length) {
      setError(`Answer all ${QUESTIONS.length} questions to generate your recap.`);
      return;
    }

    saveTranscript(text);
    savePrefs(prefs);
    const templateId = deriveTemplateId(prefs);
    saveTemplateId(templateId);

    setResult(null);
    setLoading(true);
    setLoadingStep(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 450);

    await new Promise((r) => setTimeout(r, 1800));
    clearInterval(stepInterval);

    const data = generatePersonalizedRecap(text, prefs, templateId);
    setResult(data);
    setLoading(false);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  return (
    <RecapShell>
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="uppercase tracking-wider">Personalized Recap</Badge>
        <Badge className="bg-primary/15 text-primary border border-primary/30 hover:bg-primary/15">
          {answered} / {QUESTIONS.length} answered
        </Badge>
      </div>

      <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05] mb-3">
        Turn any transcript into your{" "}
        <span className="text-lime">personal visual recap</span>.
      </h1>
      <p className="text-muted-foreground text-base mb-10 max-w-xl">
        Paste meeting notes, event transcripts, or talk summaries and transform them into a
        comic-style memory tailored to how you learn.
      </p>

      {/* Transcript */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-lime" /> 1. Your transcript
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={text}
            onChange={(e) => { setText(e.target.value); if (error) setError(null); }}
            placeholder="Paste your transcript, meeting notes, or talk summary here…"
            className="min-h-[240px] resize-y font-mono text-sm"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{wordCount} words</span>
            <span>Anything from 200 to 20,000 words works best</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
            <input
              ref={fileRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Upload .txt file
            </Button>
            <span className="text-xs text-muted-foreground">TXT upload only — PDF / audio coming soon</span>
          </div>
          {uploadError && (
            <p className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" /> {uploadError}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Preferences */}
      <h2 className="text-2xl font-semibold tracking-tight mb-1">2. Tune your recap</h2>
      <p className="text-muted-foreground text-sm mb-6">Six quick picks shape every panel.</p>

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

      {error && (
        <p className="mt-6 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}

      <div className="mt-8 flex justify-end">
        <Button type="button" size="lg" onClick={handleGenerate} disabled={loading}>
          <Sparkles className="h-4 w-4" /> Generate My Visual Recap
        </Button>
      </div>

      {/* Result */}
      {result && (
        <div ref={resultRef} className="mt-16">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="uppercase tracking-wider">Your recap</Badge>
              <Badge variant="outline" className="font-mono text-[10px]">
                Template: {result.templateId}
              </Badge>
              {prefs.format && <Badge variant="outline">{prefs.format}</Badge>}
              {prefs.intensity && <Badge variant="outline">{prefs.intensity}</Badge>}
            </div>
          </div>
          <RecapResult data={result} prefs={prefs} />
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm p-6">
          <Card className="w-full max-w-md border-lime/40 shadow-[0_0_60px_-15px_hsl(var(--primary)/0.4)]">
            <CardContent className="pt-8 pb-6 text-center">
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-lime">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
              <h3 className="text-xl font-semibold tracking-tight">
                Rewriting the event <span className="text-lime">through your lens</span>…
              </h3>
              <ul className="mt-6 space-y-2 text-left">
                {LOADING_STEPS.map((step, i) => {
                  const done = i < loadingStep;
                  const active = i === loadingStep;
                  return (
                    <li
                      key={step}
                      className={cn(
                        "flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors",
                        done
                          ? "border-lime/40 bg-primary/10 text-foreground"
                          : active
                          ? "border-border bg-secondary/60 text-foreground"
                          : "border-border bg-card text-muted-foreground",
                      )}
                    >
                      <span className="grid h-5 w-5 place-items-center">
                        {done ? (
                          <Check className="h-4 w-4 text-lime" />
                        ) : active ? (
                          <Loader2 className="h-4 w-4 animate-spin text-lime" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                        )}
                      </span>
                      {step}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </RecapShell>
  );
}
