import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RecapResult } from "./recap-result";
import {
  deriveTemplateId,
  type RecapPrefs,
} from "@/lib/recap-store";
import { generatePersonalizedRecap, type RecapData } from "@/lib/recap-generator";
import { generateVisualRecap, type RecapAiJson, type RecapImages } from "@/lib/visual-recap.functions";

type Props = {
  open: boolean;
  onClose: () => void;
  questTitle: string;
  questEmoji?: string | null;
  points: number;
  transcriptUrl: string | null;
};

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
  "Loading event transcript",
  "Building your recap",
  "Creating visual scenes",
  "Placing images into your story",
];

function mergeAiIntoRecap(base: RecapData, ai: RecapAiJson, images: RecapImages): RecapData {
  const s = base.sections;
  const a = ai.sections;
  const km = a.keyMoments?.items ?? [];
  const moment = (i: number) => km[i] ?? { label: s.keyMoments.items[i].label, summary: s.keyMoments.items[i].summary };

  return {
    ...base,
    title: ai.title || base.title,
    subtitle: ai.subtitle || base.subtitle,
    sections: {
      cover: {
        headline: a.cover.headline,
        tagline: a.cover.tagline,
        imageSlot: { ...s.cover.imageSlot, imageUrl: images.coverHero },
      },
      bigPicture: {
        title: a.bigPicture.title,
        content: a.bigPicture.content,
        bullets: s.bigPicture.bullets,
        imageSlot: { ...s.bigPicture.imageSlot, imageUrl: images.bigPictureScene },
      },
      keyMoments: {
        title: a.keyMoments.title,
        items: [0, 1, 2].map((i) => ({
          label: moment(i).label,
          summary: moment(i).summary,
          imageSlot: {
            ...s.keyMoments.items[i].imageSlot,
            imageUrl: i === 0 ? images.keyMoment_1 : i === 1 ? images.keyMoment_2 : images.keyMoment_3,
          },
        })),
      },
      decisions: {
        title: a.decisions.title,
        items: a.decisions.items.length ? a.decisions.items : ["No explicit decisions were made."],
        empty: a.decisions.items.length === 0 || (a.decisions.items[0]?.toLowerCase().includes("no explicit") ?? false),
      },
      whatMattersToYou: {
        title: a.whatMattersToYou.title,
        content: a.whatMattersToYou.content,
      },
      actionItems: {
        title: a.actionItems.title,
        items: a.actionItems.items.length
          ? a.actionItems.items
          : [{ task: "No clear action items were mentioned.", owner: "—", deadline: "—" }],
        empty: a.actionItems.items.length === 0,
      },
      memoryCard: {
        title: a.memoryCard.title,
        oneLiner: a.memoryCard.oneLiner,
        rememberThis: a.memoryCard.rememberThis,
        imageSlot: { ...s.memoryCard.imageSlot, imageUrl: images.finalMemory },
      },
    },
  };
}

export function MainQuestRecapModal({ open, onClose, questTitle, questEmoji, points, transcriptUrl }: Props) {
  const [transcript, setTranscript] = useState<string>("");
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<RecapPrefs>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<RecapData | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const answered = QUESTIONS.filter((q) => prefs[q.key]).length;

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setError(null);
    setPrefs({});
    if (!transcriptUrl) {
      setTranscript("");
      return;
    }
    let cancelled = false;
    setTranscriptLoading(true);
    setTranscriptError(null);
    fetch(transcriptUrl)
      .then((r) => {
        if (!r.ok) throw new Error("Could not load the event transcript.");
        return r.text();
      })
      .then((t) => {
        if (cancelled) return;
        if (!t.trim()) throw new Error("The transcript file is empty.");
        setTranscript(t);
      })
      .catch((e) => {
        if (cancelled) return;
        setTranscriptError(e instanceof Error ? e.message : "Could not load the transcript.");
      })
      .finally(() => {
        if (!cancelled) setTranscriptLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, transcriptUrl]);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setResult(null);
      setError(null);
      setPrefs({});
      setLoading(false);
      setLoadingStep(0);
    }, 200);
  };

  const handleGenerate = async () => {
    setError(null);
    if (!transcript.trim()) {
      setError("No transcript available yet for this quest.");
      return;
    }
    if (answered < QUESTIONS.length) {
      setError(`Answer all ${QUESTIONS.length} questions to generate your recap.`);
      return;
    }

    const templateId = deriveTemplateId(prefs);
    setResult(null);
    setLoading(true);
    setLoadingStep(0);

    await new Promise((r) => setTimeout(r, 300));
    setLoadingStep(1);

    try {
      const serverPromise = generateVisualRecap({
        data: { transcript, preferences: prefs, templateId },
      });
      const t1 = setTimeout(() => setLoadingStep(2), 1600);
      const t2 = setTimeout(() => setLoadingStep(3), 5000);

      const { recap, images } = await serverPromise;
      clearTimeout(t1);
      clearTimeout(t2);
      setLoadingStep(3);

      const base = generatePersonalizedRecap(transcript, prefs, templateId);
      const merged = mergeAiIntoRecap(base, recap, images);

      setResult(merged);
      setLoading(false);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Could not generate recap.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{questEmoji ?? "⭐"}</span> {questTitle}
          </DialogTitle>
          <DialogDescription>
            Personalized visual recap · +{points} pts · transcript provided by organizer
          </DialogDescription>
        </DialogHeader>

        {!transcriptUrl ? (
          <p className="text-sm text-amber-400 border border-amber-500/40 bg-amber-500/10 p-3 rounded-md">
            Waiting for the organizer to upload the conversation transcript (.md) for this quest.
          </p>
        ) : transcriptLoading ? (
          <div className="py-8 flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading transcript…
          </div>
        ) : transcriptError ? (
          <p className="text-sm text-destructive border border-destructive/40 bg-destructive/10 p-3 rounded-md flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {transcriptError}
          </p>
        ) : !result ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="uppercase tracking-wider">Tune your recap</Badge>
              <Badge className="bg-primary/15 text-primary border border-primary/30 hover:bg-primary/15">
                {answered} / {QUESTIONS.length} answered
              </Badge>
            </div>

            {QUESTIONS.map((q, idx) => (
              <Card key={q.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-start gap-3 text-sm">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-secondary text-[11px] font-semibold text-secondary-foreground">
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
                            "rounded-md border px-3 py-2 text-left text-xs transition-colors",
                            active
                              ? "border-lime bg-primary/10 text-foreground"
                              : "border-border bg-card hover:border-lime/50 hover:bg-accent/30 text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span>{opt}</span>
                            {active && <Check className="h-3.5 w-3.5 text-lime" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}

            {error && (
              <p className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" /> {error}
              </p>
            )}

            <Button type="button" className="w-full" disabled={loading} onClick={handleGenerate}>
              <Sparkles className="h-4 w-4 mr-2" /> Generate my visual recap
            </Button>
          </div>
        ) : (
          <div ref={resultRef} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="uppercase tracking-wider">Your recap</Badge>
              <Badge variant="outline" className="font-mono text-[10px]">Template: {result.templateId}</Badge>
              {prefs.format && <Badge variant="outline">{prefs.format}</Badge>}
              {prefs.intensity && <Badge variant="outline">{prefs.intensity}</Badge>}
              <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => setResult(null)}>
                Regenerate with different prefs
              </Button>
            </div>
            <RecapResult data={result} prefs={prefs} />
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm p-6">
            <Card className="w-full max-w-md border-lime/40">
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
      </DialogContent>
    </Dialog>
  );
}
