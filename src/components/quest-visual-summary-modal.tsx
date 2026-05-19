import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generateQuestChapterRecap,
  type QuestChapterRecap,
  type QuestSummaryPrefs,
} from "@/lib/quest-summary.functions";

type Props = {
  open: boolean;
  onClose: () => void;
  questTitle: string;
  questEmoji?: string | null;
  transcriptUrl: string | null;
  photoUrl?: string | null;
  points: number;
};

const TUNE_QUESTIONS: {
  key: keyof Pick<QuestSummaryPrefs, "purpose" | "flow" | "tone">;
  title: string;
  options: string[];
}[] = [
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
];

const VISUAL_STYLES: QuestSummaryPrefs["visualStyle"][] = [
  "Straightforward",
  "Anime",
  "Marvel / DC comic-like",
];

const LOADING_STEPS = [
  "Reading event transcript",
  "Splitting into 7 parts",
  "Writing your summaries",
  "Creating visual panels",
];

export function QuestVisualSummaryModal({
  open,
  onClose,
  questTitle,
  questEmoji,
  transcriptUrl,
  photoUrl,
  points,
}: Props) {
  const [step, setStep] = useState<"tune" | "loading" | "result">("tune");
  const [prefs, setPrefs] = useState<Partial<QuestSummaryPrefs>>({});
  const [visualStyle, setVisualStyle] = useState<QuestSummaryPrefs["visualStyle"] | "">("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuestChapterRecap | null>(null);

  const answeredTune = TUNE_QUESTIONS.filter((q) => prefs[q.key]).length;
  const canGenerate = answeredTune === 3 && !!visualStyle && !!transcriptUrl;

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep("tune");
      setPrefs({});
      setVisualStyle("");
      setError(null);
      setResult(null);
      setLoadingStep(0);
    }, 200);
  };

  const handleGenerate = async () => {
    if (!transcriptUrl) {
      setError("The organizer has not uploaded a transcript for this quest yet.");
      return;
    }
    if (!canGenerate || !visualStyle) {
      setError("Answer all questions and pick a visual style.");
      return;
    }

    setError(null);
    setStep("loading");
    setLoadingStep(0);

    try {
      const res = await fetch(transcriptUrl);
      if (!res.ok) throw new Error("Could not load the event transcript.");
      const transcript = await res.text();
      if (!transcript.trim()) throw new Error("The transcript file is empty.");

      setLoadingStep(1);
      const fullPrefs: QuestSummaryPrefs = {
        purpose: prefs.purpose,
        flow: prefs.flow,
        tone: prefs.tone,
        visualStyle,
      };

      const tick = window.setInterval(() => {
        setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
      }, 2200);

      try {
        const recap = await generateQuestChapterRecap({
          data: { transcript, questTitle, preferences: fullPrefs },
        });
        setResult(recap);
        setStep("result");
      } finally {
        window.clearInterval(tick);
      }
    } catch (e) {
      setStep("tune");
      setError(e instanceof Error ? e.message : "Could not generate summary.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{questEmoji ?? "⭐"}</span> {questTitle}
          </DialogTitle>
          <DialogDescription>
            {step === "tune"
              ? "Tune your recap, then we split the event conversation into 7 illustrated chapters."
              : step === "loading"
                ? "Building your visual summary…"
                : `Your ${result?.chapters.length ?? 7}-part recap · +${points} pts`}
          </DialogDescription>
        </DialogHeader>

        {!transcriptUrl && step === "tune" && (
          <p className="text-sm text-amber-400 border border-amber-500/40 bg-amber-500/10 p-3 rounded-md">
            Waiting for the organizer to upload the conversation transcript (.md) for this quest.
          </p>
        )}

        {photoUrl && step === "tune" && (
          <img src={photoUrl} alt="Quest proof" className="w-full max-h-40 object-cover border border-border" />
        )}

        {step === "tune" && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Tune your recap</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {answeredTune} / 3 answered · visual style {visualStyle ? "selected" : "required"}
              </p>
            </div>

            {TUNE_QUESTIONS.map((q, idx) => (
              <div key={q.key} className="border border-border p-4 space-y-3">
                <p className="text-sm font-medium flex items-start gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-secondary text-xs">{idx + 1}</span>
                  {q.title}
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {q.options.map((opt) => {
                    const active = prefs[q.key] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setPrefs((p) => ({ ...p, [q.key]: opt }))}
                        className={cn(
                          "rounded-md border px-3 py-2 text-left text-xs transition-colors",
                          active
                            ? "border-lime bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground hover:border-lime/50",
                        )}
                      >
                        <span className="flex items-center justify-between gap-1">
                          {opt}
                          {active && <Check className="h-3.5 w-3.5 text-lime shrink-0" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="border border-border p-4 space-y-2">
              <p className="text-sm font-medium flex items-start gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-secondary text-xs">4</span>
                What visual style would you like?
              </p>
              <Select value={visualStyle} onValueChange={(v) => setVisualStyle(v as QuestSummaryPrefs["visualStyle"])}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Choose a style…" />
                </SelectTrigger>
                <SelectContent>
                  {VISUAL_STYLES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" /> {error}
              </p>
            )}

            <Button
              type="button"
              className="w-full bg-lime hover:opacity-90"
              disabled={!canGenerate}
              onClick={handleGenerate}
            >
              <Sparkles className="h-4 w-4 mr-2" /> Generate visual summary
            </Button>
          </div>
        )}

        {step === "loading" && (
          <div className="py-8 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-lime mx-auto" />
            <p className="text-sm font-medium">{LOADING_STEPS[loadingStep]}</p>
            <ul className="text-left text-xs text-muted-foreground space-y-1 max-w-xs mx-auto">
              {LOADING_STEPS.map((s, i) => (
                <li key={s} className={i <= loadingStep ? "text-lime" : ""}>
                  {i < loadingStep ? "✓ " : i === loadingStep ? "→ " : "· "}
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-6">
            {result.chapters.map((ch) => (
              <article key={ch.part} className="border border-border overflow-hidden">
                <div className="bg-card/50 px-4 py-2 flex items-baseline justify-between gap-2">
                  <h4 className="font-semibold text-sm">
                    Part {ch.part} · {ch.title}
                  </h4>
                </div>
                {ch.imageUrl ? (
                  <img src={ch.imageUrl} alt="" className="w-full aspect-video object-cover border-y border-border" />
                ) : (
                  <div className="aspect-video bg-muted/30 border-y border-border grid place-items-center text-xs text-muted-foreground">
                    Visual unavailable
                  </div>
                )}
                <p className="p-4 text-sm text-muted-foreground leading-relaxed">{ch.summary}</p>
              </article>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
