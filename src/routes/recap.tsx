import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles, FileText, Wand2, Loader2, CheckCircle2, RefreshCw,
  ImageIcon, Quote, Layers, BookOpen, Zap, Star, Compass, Target,
  MessageCircle, Palette, Gauge, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { supabase } from "@/integrations/supabase/client";
import {
  deriveTemplateId,
  type RecapPrefs,
} from "@/lib/recap-store";
import { generatePersonalizedRecap as localGenerate, type RecapData } from "@/lib/recap-generator";
import { generateVisualRecap, type RecapImages } from "@/lib/visual-recap.functions";

export const Route = createFileRoute("/recap")({
  component: RecapPage,
});

// ---------------- Preference questions ----------------

type QKey = keyof RecapPrefs;
type QOption = { label: string; hint?: string; icon: React.ReactNode };
type Question = { key: QKey; index: number; title: string; subtitle: string; icon: React.ReactNode; options: QOption[] };

const QUESTIONS: Question[] = [
  {
    key: "purpose", index: 1,
    title: "What do you need this recap to do?",
    subtitle: "We'll bias the output toward your real goal.",
    icon: <Target className="h-4 w-4" />,
    options: [
      { label: "Catch me up fast", hint: "Compressed, high-signal", icon: <Zap className="h-4 w-4" /> },
      { label: "Help me actually understand it", hint: "Context + explanation", icon: <BookOpen className="h-4 w-4" /> },
      { label: "Show me what to do next", hint: "Action-heavy", icon: <Compass className="h-4 w-4" /> },
    ],
  },
  {
    key: "flow", index: 2,
    title: "How should the explanation flow?",
    subtitle: "Pick how you want the story shaped.",
    icon: <Layers className="h-4 w-4" />,
    options: [
      { label: "Big picture first", icon: <Star className="h-4 w-4" /> },
      { label: "Step by step", icon: <Layers className="h-4 w-4" /> },
      { label: "Through examples and analogies", icon: <Quote className="h-4 w-4" /> },
    ],
  },
  {
    key: "tone", index: 3,
    title: "What tone keeps you engaged?",
    subtitle: "We'll match the voice.",
    icon: <MessageCircle className="h-4 w-4" />,
    options: [
      { label: "Clear and professional", icon: <FileText className="h-4 w-4" /> },
      { label: "Friendly and simple", icon: <MessageCircle className="h-4 w-4" /> },
      { label: "Playful and energetic", icon: <Sparkles className="h-4 w-4" /> },
    ],
  },
  {
    key: "world", index: 4,
    title: "What visual world should it feel like?",
    subtitle: "Sets the illustration style.",
    icon: <Palette className="h-4 w-4" />,
    options: [
      { label: "Animated storybook", icon: <BookOpen className="h-4 w-4" /> },
      { label: "Superhero comic", icon: <Zap className="h-4 w-4" /> },
      { label: "Manga / anime-inspired", icon: <Sparkles className="h-4 w-4" /> },
    ],
  },
  {
    key: "format", index: 5,
    title: "What format would you enjoy most?",
    subtitle: "Changes the entire result layout.",
    icon: <Layers className="h-4 w-4" />,
    options: [
      { label: "Comic panels", icon: <Layers className="h-4 w-4" /> },
      { label: "Magazine / zine spread", icon: <FileText className="h-4 w-4" /> },
      { label: "Collectible cards", icon: <Star className="h-4 w-4" /> },
    ],
  },
  {
    key: "intensity", index: 6,
    title: "How visually intense should it be?",
    subtitle: "Controls glow, motion, density.",
    icon: <Gauge className="h-4 w-4" />,
    options: [
      { label: "Calm and clean", icon: <Gauge className="h-4 w-4" /> },
      { label: "Balanced and expressive", icon: <Sparkles className="h-4 w-4" /> },
      { label: "Bold and dramatic", icon: <Zap className="h-4 w-4" /> },
    ],
  },
];

// ---------------- Page ----------------

type ResultState = { recap: RecapData; images: RecapImages } | null;

function RecapPage() {
  const [transcript, setTranscript] = useState("");
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [prefs, setPrefs] = useState<RecapPrefs>({});
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<ResultState>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const questsQuery = useQuery({
    queryKey: ["main-quest-transcripts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("id, title, emoji, transcript_url, type")
        .eq("type", "main")
        .not("transcript_url", "is", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string; emoji: string | null; transcript_url: string }>;
    },
  });

  const wordCount = useMemo(
    () => (transcript.trim() ? transcript.trim().split(/\s+/).length : 0),
    [transcript],
  );

  const allAnswered = QUESTIONS.every((q) => !!prefs[q.key]);
  const canGenerate = transcript.trim().length > 0 && allAnswered && !loading;

  // Cinematic loader steps
  useEffect(() => {
    if (!loading) return;
    setLoadingStep(0);
    const id = setInterval(() => setLoadingStep((s) => (s < 4 ? s + 1 : s)), 1200);
    return () => clearInterval(id);
  }, [loading]);

  const handlePickQuest = async (q: { id: string; title: string; transcript_url: string }) => {
    setSelectedQuestId(q.id);
    setLoadingTranscript(true);
    try {
      const res = await fetch(q.transcript_url);
      if (!res.ok) throw new Error("Could not load transcript");
      const text = await res.text();
      if (!text.trim()) throw new Error("Transcript is empty");
      setTranscript(text);
      toast("Transcript loaded", { description: `${q.title} • ${text.split(/\s+/).length} words` });
    } catch (e) {
      setSelectedQuestId(null);
      toast.error("Couldn't load transcript", { description: e instanceof Error ? e.message : "Try another quest." });
    } finally {
      setLoadingTranscript(false);
    }
  };

  const onGenerate = async () => {
    if (!canGenerate) return;
    const templateId = deriveTemplateId(prefs);
    setLoading(true);
    setResult(null);

    // Local fallback always available immediately
    const local = localGenerate(transcript, prefs, templateId);
    const emptyImages: RecapImages = {
      coverHero: null, bigPictureScene: null,
      keyMoment_1: null, keyMoment_2: null, keyMoment_3: null, finalMemory: null,
    };

    try {
      const serverRes = await generateVisualRecap({
        data: {
          transcript: transcript.slice(0, 120_000),
          preferences: prefs,
          templateId,
        },
      });
      // Server returns its own AI-shaped recap (different type). Merge into local skeleton for safety.
      const merged: RecapData = {
        ...local,
        title: serverRes.recap?.title ?? local.title,
        subtitle: serverRes.recap?.subtitle ?? local.subtitle,
        templateId,
        sections: {
          ...local.sections,
          cover: {
            ...local.sections.cover,
            headline: serverRes.recap?.sections?.cover?.headline ?? local.sections.cover.headline,
            tagline: serverRes.recap?.sections?.cover?.tagline ?? local.sections.cover.tagline,
          },
          bigPicture: {
            ...local.sections.bigPicture,
            title: serverRes.recap?.sections?.bigPicture?.title ?? local.sections.bigPicture.title,
            content: serverRes.recap?.sections?.bigPicture?.content ?? local.sections.bigPicture.content,
          },
          keyMoments: {
            ...local.sections.keyMoments,
            title: serverRes.recap?.sections?.keyMoments?.title ?? local.sections.keyMoments.title,
            items: (serverRes.recap?.sections?.keyMoments?.items ?? []).slice(0, 3).map((it, i) => ({
              label: it.label,
              summary: it.summary,
              imageSlot: local.sections.keyMoments.items[i]?.imageSlot ?? local.sections.keyMoments.items[0].imageSlot,
            })).concat(local.sections.keyMoments.items).slice(0, 3),
          },
          decisions: {
            ...local.sections.decisions,
            title: serverRes.recap?.sections?.decisions?.title ?? local.sections.decisions.title,
            items: serverRes.recap?.sections?.decisions?.items ?? local.sections.decisions.items,
            empty: (serverRes.recap?.sections?.decisions?.items ?? []).length === 0
              ? local.sections.decisions.empty
              : false,
          },
          whatMattersToYou: {
            ...local.sections.whatMattersToYou,
            title: serverRes.recap?.sections?.whatMattersToYou?.title ?? local.sections.whatMattersToYou.title,
            content: serverRes.recap?.sections?.whatMattersToYou?.content ?? local.sections.whatMattersToYou.content,
          },
          actionItems: {
            ...local.sections.actionItems,
            title: serverRes.recap?.sections?.actionItems?.title ?? local.sections.actionItems.title,
            items: serverRes.recap?.sections?.actionItems?.items ?? local.sections.actionItems.items,
            empty: (serverRes.recap?.sections?.actionItems?.items ?? []).length === 0
              ? local.sections.actionItems.empty
              : false,
          },
          memoryCard: {
            ...local.sections.memoryCard,
            title: serverRes.recap?.sections?.memoryCard?.title ?? local.sections.memoryCard.title,
            oneLiner: serverRes.recap?.sections?.memoryCard?.oneLiner ?? local.sections.memoryCard.oneLiner,
            rememberThis: serverRes.recap?.sections?.memoryCard?.rememberThis ?? local.sections.memoryCard.rememberThis,
          },
        },
      };
      setResult({ recap: merged, images: serverRes.images ?? emptyImages });
    } catch (err) {
      console.error("Visual recap generation failed, using local fallback", err);
      toast("Using offline recap", { description: "AI service is unavailable — generated a transcript-based recap locally." });
      setResult({ recap: local, images: emptyImages });
    } finally {
      setLoading(false);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  };

  const onReset = () => {
    setResult(null);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  return (
    <div className="recap-bg min-h-screen text-foreground">
      <AppHeader />
      <Hero />

      <main className="mx-auto max-w-6xl px-4 pb-32 space-y-12">
        <TranscriptCard
          transcript={transcript}
          setTranscript={setTranscript}
          wordCount={wordCount}
          onFile={handleFile}
        />

        <section className="space-y-6">
          <SectionHeader
            kicker="Step 2"
            title="Tune your recap"
            description="Six quick choices shape tone, structure, style, and intensity."
          />
          <div className="grid gap-6">
            {QUESTIONS.map((q) => (
              <PreferenceQuestion
                key={q.key}
                question={q}
                value={prefs[q.key]}
                onChange={(v) => setPrefs((p) => ({ ...p, [q.key]: v }))}
              />
            ))}
          </div>
        </section>

        {!result && (
          <div className="sticky bottom-6 z-20 flex justify-center">
            <div className="recap-glass-strong recap-glow flex w-full max-w-2xl items-center justify-between gap-4 rounded-2xl p-3 pl-5">
              <div className="text-sm text-silver/90">
                {!transcript.trim()
                  ? "Add a transcript to begin."
                  : !allAnswered
                    ? `Answer all 6 questions (${QUESTIONS.filter((q) => prefs[q.key]).length}/6).`
                    : "Ready when you are."}
              </div>
              <Button
                size="lg"
                disabled={!canGenerate}
                onClick={onGenerate}
                className="recap-shine rounded-xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground font-semibold shadow-glow"
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Generate My Visual Recap
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div ref={resultRef} className="space-y-6 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionHeader kicker="Step 3" title="Your visual recap" description="Generated from your transcript." />
              <div className="flex items-center gap-2">
                <span className="recap-glass rounded-full px-3 py-1 text-xs font-mono text-cyan-soft">
                  Template: {result.recap.templateId}
                </span>
                <Button variant="outline" size="sm" onClick={onReset} className="rounded-xl">
                  <RefreshCw className="mr-2 h-4 w-4" /> Start over
                </Button>
              </div>
            </div>
            <RecapResult data={result.recap} images={result.images} prefs={prefs} />
          </div>
        )}
      </main>

      {loading && <LoadingOverlay step={loadingStep} />}
    </div>
  );
}

// ---------------- Hero ----------------

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-grid opacity-60" />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="recap-float-a absolute left-[8%] top-24 h-40 w-32 rounded-2xl recap-glass recap-glow-soft" />
        <div className="recap-float-b absolute right-[10%] top-16 h-32 w-44 rounded-2xl recap-glass recap-glow-soft" />
        <div className="recap-float-a absolute left-[42%] top-40 h-24 w-24 rounded-xl recap-glass recap-glow-soft" />
        <div className="recap-float-b absolute right-[30%] top-56 h-20 w-32 rounded-xl recap-glass" />
      </div>
      <div className="mx-auto max-w-5xl px-4 pt-20 pb-16 text-center">
        <div className="recap-glass mx-auto inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-cyan-soft">
          <Sparkles className="h-3.5 w-3.5" /> Personalized Visual Recap
        </div>
        <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight text-foreground">
          Turn any transcript into your
          <span className="ml-3 bg-gradient-to-r from-[oklch(0.82_0.14_215)] to-[oklch(0.72_0.18_245)] bg-clip-text text-transparent">
            personal visual recap
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base md:text-lg text-silver/80">
          Paste meeting notes, event transcripts, or talk summaries and transform them into a personalized
          comic, zine, or card-style memory.
        </p>
      </div>
    </section>
  );
}

// ---------------- Transcript ----------------

function TranscriptCard(props: {
  transcript: string;
  setTranscript: (v: string) => void;
  wordCount: number;
  onFile: (f: File) => void;
}) {
  const { transcript, setTranscript, wordCount, onFile } = props;
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className="space-y-4">
      <SectionHeader
        kicker="Step 1"
        title="Bring your transcript"
        description="Paste it in, or drop a .txt file. We never store it server-side."
      />
      <div
        className={`recap-glass rounded-2xl p-5 transition ${dragging ? "recap-glow" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-silver/80">
            <FileText className="h-4 w-4 text-cyan-soft" />
            Transcript • <span className="font-mono text-cyan-soft">{wordCount.toLocaleString()}</span> words
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => inputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Upload .txt
            </Button>
            {transcript && (
              <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => setTranscript("")}>
                <X className="mr-1 h-4 w-4" /> Clear
              </Button>
            )}
          </div>
        </div>
        <Textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste meeting notes, an event transcript, talk summary, or interview here…"
          className="mt-4 min-h-[220px] resize-y rounded-xl border-white/10 bg-background/40 text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-primary/40"
        />
      </div>
    </section>
  );
}

// ---------------- Preference ----------------

function PreferenceQuestion(props: {
  question: Question;
  value?: string;
  onChange: (v: string) => void;
}) {
  const { question, value, onChange } = props;
  return (
    <div className="recap-glass rounded-2xl p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="recap-glass-strong grid h-8 w-8 shrink-0 place-items-center rounded-lg text-cyan-soft">
          {question.icon}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-cyan-soft/80">
            Question {question.index} of 6
          </div>
          <h3 className="text-lg font-semibold text-foreground">{question.title}</h3>
          <p className="text-sm text-silver/70">{question.subtitle}</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {question.options.map((opt) => {
          const selected = value === opt.label;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange(opt.label)}
              className={`recap-shine group relative rounded-xl border p-4 text-left transition
                ${selected
                  ? "recap-glow border-primary/60 bg-primary/10"
                  : "border-white/10 bg-background/30 hover:border-white/25 hover:bg-background/50"}`}
            >
              <div className="flex items-center gap-2 text-cyan-soft">
                {opt.icon}
                <span className="text-xs uppercase tracking-wider opacity-80">Option</span>
                {selected && <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />}
              </div>
              <div className="mt-1 font-medium text-foreground">{opt.label}</div>
              {opt.hint && <div className="mt-1 text-xs text-silver/60">{opt.hint}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Loading overlay ----------------

const LOADING_STEPS = [
  "Reading transcript",
  "Extracting key moments",
  "Building your recap",
  "Creating visual scenes",
  "Placing images into your story",
];

function LoadingOverlay({ step }: { step: number }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-xl animate-fade-in">
      <div className="recap-glass-strong recap-glow w-[min(92vw,560px)] rounded-3xl p-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-cyan-soft">Generating</div>
            <div className="text-lg font-semibold">Composing your visual recap</div>
          </div>
        </div>
        <ul className="mt-6 space-y-3">
          {LOADING_STEPS.map((label, i) => {
            const state = i < step ? "done" : i === step ? "active" : "todo";
            return (
              <li key={label} className="flex items-center gap-3">
                <div
                  className={`grid h-6 w-6 place-items-center rounded-full border ${
                    state === "done" ? "border-primary bg-primary/20 text-primary" :
                    state === "active" ? "border-cyan-soft text-cyan-soft recap-pulse" :
                    "border-white/10 text-muted-foreground/70"
                  }`}
                >
                  {state === "done" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                    state === "active" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                    <span className="text-[10px]">{i + 1}</span>}
                </div>
                <span className={state === "todo" ? "text-muted-foreground/70" : "text-foreground"}>{label}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div className="recap-shimmer h-full w-full" />
        </div>
      </div>
    </div>
  );
}

// ---------------- Image slot (premium placeholder + progressive load) ----------------

function VisualSlot(props: {
  src?: string | null;
  label: string;
  aspect?: "wide" | "square" | "portrait";
  className?: string;
}) {
  const { src, label, aspect = "wide", className = "" } = props;
  const aspectClass =
    aspect === "square" ? "aspect-square" :
    aspect === "portrait" ? "aspect-[3/4]" :
    "aspect-[16/9]";
  return (
    <div className={`relative overflow-hidden rounded-xl border border-white/10 ${aspectClass} ${className}`}>
      {src ? (
        <img src={src} alt={label} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      ) : (
        <>
          <div className="absolute inset-0 recap-shimmer opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-cyan-500/10" />
          <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/50 px-2 py-1 text-[10px] text-cyan-soft backdrop-blur">
            <ImageIcon className="h-3 w-3" /> {label}
          </div>
          <div className="pointer-events-none absolute -right-8 -bottom-8 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        </>
      )}
    </div>
  );
}

// ---------------- Section header ----------------

function SectionHeader(props: { kicker: string; title: string; description?: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-[0.2em] text-cyan-soft">{props.kicker}</div>
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{props.title}</h2>
      {props.description && <p className="text-sm text-silver/70">{props.description}</p>}
    </div>
  );
}

// ---------------- Result router ----------------

function RecapResult({ data, images, prefs }: { data: RecapData; images: RecapImages; prefs: RecapPrefs }) {
  const format = prefs.format ?? "Magazine / zine spread";
  const intensity = prefs.intensity ?? "Balanced and expressive";
  const intensityClass =
    intensity === "Bold and dramatic" ? "recap-glow"
    : intensity === "Calm and clean" ? ""
    : "recap-glow-soft";

  if (format === "Comic panels") return <ComicLayout data={data} images={images} accent={intensityClass} prefs={prefs} />;
  if (format === "Collectible cards") return <CardsLayout data={data} images={images} accent={intensityClass} prefs={prefs} />;
  return <MagazineLayout data={data} images={images} accent={intensityClass} prefs={prefs} />;
}

// ---------------- Magazine layout ----------------

function MagazineLayout({ data, images, accent, prefs }: LayoutProps) {
  const km = data.sections.keyMoments.items;
  return (
    <div className="space-y-8">
      {/* Cover */}
      <div className={`recap-glass-strong ${accent} overflow-hidden rounded-3xl`}>
        <div className="grid gap-0 md:grid-cols-5">
          <div className="md:col-span-3 p-8 md:p-10">
            <div className="text-xs uppercase tracking-[0.2em] text-cyan-soft">{worldLabel(prefs.world)} • Cover</div>
            <h3 className="mt-3 text-3xl md:text-5xl font-bold leading-tight">{data.sections.cover.headline}</h3>
            <p className="mt-4 text-silver/80 text-base md:text-lg">{data.sections.cover.tagline}</p>
          </div>
          <div className="md:col-span-2 p-5">
            <VisualSlot src={images.coverHero} label="coverHero" aspect="portrait" />
          </div>
        </div>
      </div>

      {/* Big picture */}
      <div className={`recap-glass ${accent} rounded-3xl overflow-hidden`}>
        <div className="grid gap-0 md:grid-cols-5">
          <div className="md:col-span-3 p-6 md:p-8">
            <SectionMini title={data.sections.bigPicture.title} icon={<Compass className="h-4 w-4" />} />
            <p className="mt-3 text-base leading-relaxed text-foreground/90">{data.sections.bigPicture.content}</p>
            {data.sections.bigPicture.bullets.length > 0 && (
              <ul className="mt-4 space-y-2">
                {data.sections.bigPicture.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2 text-sm text-silver/85">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> {b}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="md:col-span-2 p-5">
            <VisualSlot src={images.bigPictureScene} label="bigPictureScene" />
          </div>
        </div>
      </div>

      {/* Key moments */}
      <div>
        <SectionMini title={data.sections.keyMoments.title} icon={<Star className="h-4 w-4" />} />
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          {km.map((m, i) => (
            <div key={i} className={`recap-glass ${accent} rounded-2xl p-4`}>
              <VisualSlot src={[images.keyMoment_1, images.keyMoment_2, images.keyMoment_3][i] ?? null} label={`keyMoment_${i+1}`} aspect="square" />
              <div className="mt-3 text-xs uppercase tracking-wider text-cyan-soft">{m.label}</div>
              <p className="mt-1 text-sm text-foreground/90">{m.summary}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Decisions + What matters */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="recap-glass rounded-2xl p-6">
          <SectionMini title={data.sections.decisions.title} icon={<CheckCircle2 className="h-4 w-4" />} />
          <ul className="mt-3 space-y-2">
            {data.sections.decisions.items.map((it, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground/90">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> {it}
              </li>
            ))}
          </ul>
        </div>
        <div className="recap-glass rounded-2xl p-6">
          <SectionMini title={data.sections.whatMattersToYou.title} icon={<Quote className="h-4 w-4" />} />
          <p className="mt-3 italic text-foreground/90">"{data.sections.whatMattersToYou.content}"</p>
        </div>
      </div>

      {/* Actions */}
      <div className="recap-glass rounded-2xl p-6">
        <SectionMini title={data.sections.actionItems.title} icon={<Target className="h-4 w-4" />} />
        <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-background/40 text-cyan-soft">
              <tr><th className="px-3 py-2 text-left font-medium">Task</th><th className="px-3 py-2 text-left font-medium">Owner</th><th className="px-3 py-2 text-left font-medium">Deadline</th></tr>
            </thead>
            <tbody>
              {data.sections.actionItems.items.map((a, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="px-3 py-2 text-foreground/90">{a.task}</td>
                  <td className="px-3 py-2 text-silver/80">{a.owner}</td>
                  <td className="px-3 py-2 text-silver/80">{a.deadline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Memory card */}
      <div className={`recap-glass-strong ${accent} overflow-hidden rounded-3xl`}>
        <div className="grid gap-0 md:grid-cols-5">
          <div className="md:col-span-2 p-5">
            <VisualSlot src={images.finalMemory} label="finalMemory" />
          </div>
          <div className="md:col-span-3 p-8">
            <div className="text-xs uppercase tracking-[0.2em] text-cyan-soft">{data.sections.memoryCard.title}</div>
            <p className="mt-3 text-2xl font-semibold leading-snug">{data.sections.memoryCard.oneLiner}</p>
            <p className="mt-4 text-silver/80">Remember this: {data.sections.memoryCard.rememberThis}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- Comic layout ----------------

function ComicLayout({ data, images, accent, prefs }: LayoutProps) {
  const km = data.sections.keyMoments.items;
  return (
    <div className="space-y-6">
      <Panel className={accent}>
        <Caption>Cover • {worldLabel(prefs.world)}</Caption>
        <VisualSlot src={images.coverHero} label="coverHero" />
        <Speech className="mt-4">
          <div className="text-2xl md:text-3xl font-bold">{data.sections.cover.headline}</div>
          <div className="mt-2 text-silver/85">{data.sections.cover.tagline}</div>
        </Speech>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel className={accent}>
          <Caption>{data.sections.bigPicture.title}</Caption>
          <VisualSlot src={images.bigPictureScene} label="bigPictureScene" />
          <p className="mt-3 text-foreground/90">{data.sections.bigPicture.content}</p>
        </Panel>
        <Panel className={accent}>
          <Caption>{data.sections.whatMattersToYou.title}</Caption>
          <Speech><p className="italic">"{data.sections.whatMattersToYou.content}"</p></Speech>
        </Panel>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {km.map((m, i) => (
          <Panel key={i} className={accent}>
            <Caption>{m.label}</Caption>
            <VisualSlot src={[images.keyMoment_1, images.keyMoment_2, images.keyMoment_3][i] ?? null} label={`keyMoment_${i+1}`} aspect="square" />
            <p className="mt-3 text-sm text-foreground/90">{m.summary}</p>
          </Panel>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel className={accent}>
          <Caption>{data.sections.decisions.title}</Caption>
          <ul className="space-y-2">
            {data.sections.decisions.items.map((d, i) => (
              <li key={i} className="flex gap-2 text-foreground/90"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{d}</li>
            ))}
          </ul>
        </Panel>
        <Panel className={accent}>
          <Caption>{data.sections.actionItems.title}</Caption>
          <ul className="space-y-2">
            {data.sections.actionItems.items.map((a, i) => (
              <li key={i} className="text-sm text-foreground/90">
                <span className="font-medium">{a.task}</span>
                <span className="text-silver/70"> — {a.owner} • {a.deadline}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className={accent}>
        <Caption>{data.sections.memoryCard.title}</Caption>
        <div className="grid gap-4 md:grid-cols-2">
          <VisualSlot src={images.finalMemory} label="finalMemory" />
          <Speech>
            <p className="text-xl font-semibold">{data.sections.memoryCard.oneLiner}</p>
            <p className="mt-2 text-silver/85">Remember this: {data.sections.memoryCard.rememberThis}</p>
          </Speech>
        </div>
      </Panel>
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`comic-panel p-5 ${className}`}>{children}</div>;
}
function Caption({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 inline-block rounded-md bg-foreground px-2 py-1 text-xs font-bold uppercase tracking-wider text-background">
      {children}
    </div>
  );
}
function Speech({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-2xl border border-white/15 bg-background/40 p-4 ${className}`}>
      {children}
    </div>
  );
}

// ---------------- Cards layout ----------------

function CardsLayout({ data, images, accent, prefs }: LayoutProps) {
  const cards: { title: string; kicker: string; body: React.ReactNode; img: string | null; slot: string }[] = [
    { title: data.sections.cover.headline, kicker: "Cover", body: data.sections.cover.tagline, img: images.coverHero, slot: "coverHero" },
    { title: data.sections.bigPicture.title, kicker: "Big picture", body: data.sections.bigPicture.content, img: images.bigPictureScene, slot: "bigPictureScene" },
    ...data.sections.keyMoments.items.map((m, i) => ({
      title: m.label, kicker: `Moment ${i+1}`, body: m.summary,
      img: [images.keyMoment_1, images.keyMoment_2, images.keyMoment_3][i] ?? null,
      slot: `keyMoment_${i+1}`,
    })),
    {
      title: data.sections.decisions.title, kicker: "Decisions", img: null, slot: "decisions",
      body: (
        <ul className="space-y-1">
          {data.sections.decisions.items.map((d, i) => <li key={i} className="text-sm">• {d}</li>)}
        </ul>
      ),
    },
    {
      title: data.sections.whatMattersToYou.title, kicker: "For you", img: null, slot: "matters",
      body: <p className="italic">"{data.sections.whatMattersToYou.content}"</p>,
    },
    {
      title: data.sections.actionItems.title, kicker: "Next", img: null, slot: "actions",
      body: (
        <ul className="space-y-1">
          {data.sections.actionItems.items.map((a, i) => (
            <li key={i} className="text-sm"><span className="font-medium">{a.task}</span> <span className="text-silver/70">— {a.owner} • {a.deadline}</span></li>
          ))}
        </ul>
      ),
    },
    { title: data.sections.memoryCard.oneLiner, kicker: "Memory", body: `Remember this: ${data.sections.memoryCard.rememberThis}`, img: images.finalMemory, slot: "finalMemory" },
  ];

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4">
      <div className="flex snap-x snap-mandatory gap-5">
        {cards.map((c, i) => (
          <div key={i} className={`recap-glass-strong ${accent} snap-start shrink-0 w-[78vw] max-w-sm rounded-3xl p-4`}>
            <VisualSlot src={c.img} label={c.slot} aspect="square" />
            <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-cyan-soft">
              <span>{c.kicker}</span>
              <span className="recap-glass rounded-full px-2 py-0.5">{worldLabel(prefs.world)}</span>
            </div>
            <h4 className="mt-2 text-lg font-semibold leading-snug">{c.title}</h4>
            <div className="mt-2 text-sm text-foreground/85">{c.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

type LayoutProps = { data: RecapData; images: RecapImages; accent: string; prefs: RecapPrefs };

function SectionMini({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
    </div>
  );
}

function worldLabel(world?: string) {
  if (world === "Superhero comic") return "Hero";
  if (world === "Manga / anime-inspired") return "Manga";
  return "Storybook";
}
