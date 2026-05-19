import { Heart, Sparkles, Calendar, User, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageSlot } from "@/components/recap/image-slot";
import { cn } from "@/lib/utils";
import type { RecapData } from "@/lib/recap-generator";
import type { RecapPrefs } from "@/lib/recap-store";

type VisualMode = "storybook" | "hero" | "manga";
type Intensity = "calm" | "balanced" | "bold";
type Format = "comic" | "magazine" | "cards";

// ------------- theme helpers -------------

function readMode(data: RecapData): VisualMode {
  const m = data.templateId.split("_")[1];
  return m === "hero" || m === "manga" ? m : "storybook";
}
function readIntensity(p: RecapPrefs): Intensity {
  if (p.intensity === "Bold and dramatic") return "bold";
  if (p.intensity === "Calm and clean") return "calm";
  return "balanced";
}
function readFormat(p: RecapPrefs): Format {
  if (p.format === "Comic panels") return "comic";
  if (p.format === "Collectible cards") return "cards";
  return "magazine";
}

function theme(mode: VisualMode, intensity: Intensity) {
  const borderW =
    intensity === "bold" ? "border-[3px]" : intensity === "calm" ? "border" : "border-2";
  const shadow =
    intensity === "bold"
      ? "shadow-[8px_8px_0_0_hsl(var(--border))]"
      : intensity === "calm"
      ? ""
      : "shadow-[4px_4px_0_0_hsl(var(--border))]";

  switch (mode) {
    case "hero":
      return {
        panel: cn(borderW, "border-lime/70 rounded-md", shadow),
        accent: "text-lime",
        sticker: "bg-lime text-primary-foreground",
        title: "uppercase tracking-tight font-black",
        gap: intensity === "calm" ? "space-y-8" : intensity === "bold" ? "space-y-4" : "space-y-6",
      };
    case "manga":
      return {
        panel: cn(borderW, "border-dashed border-fuchsia-400/70 rounded-sm", shadow),
        accent: "text-fuchsia-400",
        sticker: "bg-fuchsia-500 text-white",
        title: "italic tracking-tight font-semibold",
        gap: intensity === "calm" ? "space-y-8" : intensity === "bold" ? "space-y-4" : "space-y-6",
      };
    case "storybook":
    default:
      return {
        panel: cn(borderW, "border-amber-500/50 rounded-2xl", shadow),
        accent: "text-amber-400",
        sticker: "bg-amber-500 text-black",
        title: "tracking-tight font-semibold",
        gap: intensity === "calm" ? "space-y-8" : intensity === "bold" ? "space-y-4" : "space-y-6",
      };
  }
}

function titleSize(intensity: Intensity) {
  return intensity === "bold"
    ? "text-5xl sm:text-6xl"
    : intensity === "calm"
    ? "text-3xl sm:text-4xl"
    : "text-4xl sm:text-5xl";
}

// ============================================================
// MAIN
// ============================================================
export function RecapResult({ data, prefs }: { data: RecapData; prefs: RecapPrefs }) {
  const mode = readMode(data);
  const intensity = readIntensity(prefs);
  const format = readFormat(prefs);
  const t = theme(mode, intensity);

  if (format === "comic") return <ComicLayout data={data} t={t} intensity={intensity} mode={mode} />;
  if (format === "cards") return <CardsLayout data={data} t={t} intensity={intensity} mode={mode} />;
  return <MagazineLayout data={data} t={t} intensity={intensity} mode={mode} />;
}

type T = ReturnType<typeof theme>;

// ============================================================
// COMIC PANELS LAYOUT — sequential page, caption bars, speech bubbles
// ============================================================
function ComicLayout({ data, t, intensity, mode }: { data: RecapData; t: T; intensity: Intensity; mode: VisualMode }) {
  const s = data.sections;
  return (
    <div className={t.gap}>
      {/* Page 1: cover splash */}
      <ComicPanel t={t} caption="ISSUE #01">
        <ImageSlot slot={s.cover.imageSlot} className="rounded-none border-0 border-b" />
        <div className="p-6 sm:p-8">
          <h1 className={cn(titleSize(intensity), t.title, "leading-[1.02]")}>{s.cover.headline}</h1>
          <SpeechBubble mode={mode}>{s.cover.tagline}</SpeechBubble>
        </div>
      </ComicPanel>

      {/* Page 2: big picture — wide panel */}
      <ComicPanel t={t} caption="MEANWHILE…">
        <ImageSlot slot={s.bigPicture.imageSlot} className="rounded-none border-0 border-b" />
        <div className="p-5 sm:p-6">
          <h2 className={cn("text-xl mb-3", t.title)}>{s.bigPicture.title}</h2>
          <p className="text-base leading-relaxed">{s.bigPicture.content}</p>
        </div>
      </ComicPanel>

      {/* Page 3: 3 stacked moment panels with caption bars */}
      {s.keyMoments.items.map((m, i) => (
        <ComicPanel key={i} t={t} caption={`PANEL ${String(i + 1).padStart(2, "0")} · ${m.label.toUpperCase()}`}>
          <ImageSlot slot={{ ...m.imageSlot, ratio: "16:9" }} className="rounded-none border-0 border-b" />
          <div className="p-5">
            <SpeechBubble mode={mode}>{m.summary}</SpeechBubble>
          </div>
        </ComicPanel>
      ))}

      {/* Decisions — KAPOW grid */}
      <ComicPanel t={t} caption="DECISIONS">
        <div className="p-5">
          {s.decisions.empty ? (
            <p className="text-sm text-muted-foreground">{s.decisions.items[0]}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {s.decisions.items.map((d, i) => (
                <div key={i} className={cn("relative rounded-md border-2 bg-secondary/40 p-4", mode === "hero" ? "border-lime/60" : mode === "manga" ? "border-dashed border-fuchsia-400/60" : "border-amber-500/40")}>
                  <span className={cn("absolute -top-2 -left-2 px-2 py-0.5 text-[10px] font-black uppercase rounded", t.sticker)}>
                    {mode === "hero" ? "BAM!" : mode === "manga" ? "DONE!" : "Decided"}
                  </span>
                  <p className="text-sm pt-1">{d}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </ComicPanel>

      {/* What matters */}
      <ComicPanel t={t} caption="WHAT MATTERS TO YOU">
        <div className="flex items-start gap-3 p-5">
          <Heart className={cn("mt-1 h-5 w-5 shrink-0", t.accent)} />
          <p className="text-base leading-relaxed">{s.whatMattersToYou.content}</p>
        </div>
      </ComicPanel>

      {/* Actions */}
      <ComicPanel t={t} caption="NEXT…">
        <div className="p-5 space-y-2">
          {s.actionItems.items.map((a, i) => (
            <div key={i} className="flex items-start gap-3 rounded-md border border-border bg-secondary/40 p-3">
              <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black", t.sticker)}>{i + 1}</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{a.task}</p>
                <ActionMeta a={a} />
              </div>
            </div>
          ))}
        </div>
      </ComicPanel>

      {/* Final memory — splash */}
      <ComicPanel t={t} caption="THE END.">
        <ImageSlot slot={s.memoryCard.imageSlot} className="rounded-none border-0 border-b" />
        <div className="p-6 sm:p-8">
          <p className={cn("text-2xl sm:text-3xl leading-snug", t.title)}>"{s.memoryCard.oneLiner}"</p>
          <p className="mt-4 text-sm text-muted-foreground">
            Remember this: <span className="text-foreground font-semibold">{s.memoryCard.rememberThis}</span>
          </p>
        </div>
      </ComicPanel>
    </div>
  );
}

function ComicPanel({ t, caption, children }: { t: T; caption: string; children: React.ReactNode }) {
  return (
    <div className={cn("overflow-hidden bg-card", t.panel)}>
      <div className={cn("px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] border-b", t.sticker)}>
        {caption}
      </div>
      {children}
    </div>
  );
}

function SpeechBubble({ mode, children }: { mode: VisualMode; children: React.ReactNode }) {
  const color =
    mode === "hero" ? "border-lime/60" : mode === "manga" ? "border-dashed border-fuchsia-400/70" : "border-amber-500/50";
  return (
    <div className={cn("relative inline-block max-w-full rounded-2xl border-2 bg-background px-4 py-3 text-sm leading-snug", color)}>
      {children}
      <span className={cn("absolute -bottom-2 left-6 h-3 w-3 rotate-45 border-b-2 border-r-2 bg-background", color)} />
    </div>
  );
}

// ============================================================
// MAGAZINE / ZINE LAYOUT — asymmetric editorial, pull quotes, stickers
// ============================================================
function MagazineLayout({ data, t, intensity, mode }: { data: RecapData; t: T; intensity: Intensity; mode: VisualMode }) {
  const s = data.sections;
  return (
    <div className={t.gap}>
      {/* Editorial masthead */}
      <Card className={cn("overflow-hidden", t.panel)}>
        <CardContent className="p-0">
          <div className="grid sm:grid-cols-[1.2fr_1fr]">
            <ImageSlot slot={s.cover.imageSlot} className="rounded-none border-0 sm:border-r" />
            <div className="p-6 sm:p-8 flex flex-col justify-center">
              <div className={cn("mb-3 inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest", t.sticker)}>
                <Sparkles className="h-3 w-3" /> Issue #01 · Vol. You
              </div>
              <h1 className={cn(titleSize(intensity), t.title, "leading-[1.02] mb-3")}>{s.cover.headline}</h1>
              <p className="text-sm text-muted-foreground">{s.cover.tagline}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Big picture — asymmetric with pull quote */}
      <Card className={cn(t.panel)}>
        <CardContent className="pt-6">
          <SectionHeader t={t} number={2} title={s.bigPicture.title} />
          <div className="grid gap-5 sm:grid-cols-[1fr_1.4fr]">
            <ImageSlot slot={s.bigPicture.imageSlot} />
            <div className="space-y-4">
              <p className="text-lg leading-snug">{s.bigPicture.content}</p>
              {s.bigPicture.bullets.length > 0 && (
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {s.bigPicture.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2">
                      <span className={cn("font-bold", t.accent)}>·</span>{b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key moments — scrapbook asymmetric grid */}
      <Card className={cn(t.panel)}>
        <CardContent className="pt-6">
          <SectionHeader t={t} number={3} title={s.keyMoments.title} />
          <div className="grid gap-4 sm:grid-cols-6">
            {s.keyMoments.items.map((m, i) => {
              const span = i === 0 ? "sm:col-span-4" : "sm:col-span-2";
              const rotate = mode === "manga" ? (i === 1 ? "sm:rotate-1" : i === 2 ? "sm:-rotate-1" : "") : "";
              return (
                <div key={i} className={cn(span, rotate, "rounded-lg border bg-secondary/40 p-3", mode === "hero" ? "border-lime/40" : mode === "manga" ? "border-dashed border-fuchsia-400/50" : "border-amber-500/30")}>
                  <ImageSlot slot={m.imageSlot} className="mb-3" />
                  <div className={cn("mb-1 text-[10px] font-bold uppercase tracking-widest", t.accent)}>{m.label}</div>
                  <p className="text-sm leading-snug">{m.summary}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Decisions — pull quote style */}
      <Card className={cn(t.panel)}>
        <CardContent className="pt-6">
          <SectionHeader t={t} number={4} title={s.decisions.title} />
          {s.decisions.empty ? (
            <p className="text-sm text-muted-foreground italic">{s.decisions.items[0]}</p>
          ) : (
            <div className="space-y-3">
              {s.decisions.items.map((d, i) => (
                <div key={i} className="flex gap-3 rounded-md border-l-4 bg-secondary/40 p-4" style={{ borderLeftColor: "currentColor" }}>
                  <Quote className={cn("h-5 w-5 shrink-0", t.accent)} />
                  <p className="text-sm leading-snug">{d}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* What matters */}
      <Card className={cn(t.panel)}>
        <CardContent className="pt-6">
          <SectionHeader t={t} number={5} title={s.whatMattersToYou.title} />
          <div className="flex items-start gap-4 rounded-md bg-secondary/40 p-5">
            <Heart className={cn("mt-1 h-5 w-5 shrink-0", t.accent)} />
            <p className="text-base leading-relaxed italic">"{s.whatMattersToYou.content}"</p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className={cn(t.panel)}>
        <CardContent className="pt-6">
          <SectionHeader t={t} number={6} title={s.actionItems.title} />
          <ol className="space-y-2">
            {s.actionItems.items.map((a, i) => (
              <li key={i} className="flex items-start gap-3 rounded-md border border-border bg-secondary/40 p-3">
                <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold", t.sticker)}>{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.task}</p>
                  <ActionMeta a={a} />
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Final memory card */}
      <Card className={cn("overflow-hidden", t.panel)}>
        <CardContent className="p-0">
          <ImageSlot slot={s.memoryCard.imageSlot} className="rounded-none border-0 border-b" />
          <div className="p-6 sm:p-8">
            <div className={cn("mb-3 text-[10px] font-bold uppercase tracking-widest", t.accent)}>{s.memoryCard.title}</div>
            <p className={cn("text-xl sm:text-2xl leading-snug", t.title)}>"{s.memoryCard.oneLiner}"</p>
            <p className="mt-4 text-sm text-muted-foreground">
              Remember this: <span className="text-foreground font-medium">{s.memoryCard.rememberThis}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SectionHeader({ t, number, title }: { t: T; number: number; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className={cn("grid h-7 w-7 place-items-center rounded-md text-xs font-bold", t.sticker)}>{number}</span>
      <h2 className={cn("text-lg", t.title)}>{title}</h2>
    </div>
  );
}

// ============================================================
// COLLECTIBLE CARDS LAYOUT — horizontal swipeable deck
// ============================================================
function CardsLayout({ data, t, intensity, mode }: { data: RecapData; t: T; intensity: Intensity; mode: VisualMode }) {
  const s = data.sections;
  const scrollerRef = useRef<HTMLDivElement>(null);

  const cards: { badge: string; title: string; body: React.ReactNode; img: typeof s.cover.imageSlot }[] = [
    { badge: "01 · Cover", title: s.cover.headline, body: <p className="text-sm text-muted-foreground">{s.cover.tagline}</p>, img: s.cover.imageSlot },
    { badge: "02 · Big Picture", title: s.bigPicture.title, body: <p className="text-sm leading-snug">{s.bigPicture.content}</p>, img: s.bigPicture.imageSlot },
    ...s.keyMoments.items.map((m, i) => ({
      badge: `0${3 + i} · ${m.label}`,
      title: s.keyMoments.title,
      body: <p className="text-sm leading-snug">{m.summary}</p>,
      img: m.imageSlot,
    })),
    {
      badge: "06 · Decisions",
      title: s.decisions.title,
      body: (
        <ul className="space-y-1.5 text-sm">
          {s.decisions.items.slice(0, 3).map((d, i) => (
            <li key={i} className="flex gap-2"><span className={cn("font-bold", t.accent)}>·</span>{d}</li>
          ))}
        </ul>
      ),
      img: s.bigPicture.imageSlot,
    },
    {
      badge: "07 · What matters",
      title: s.whatMattersToYou.title,
      body: <p className="text-sm leading-relaxed italic">"{s.whatMattersToYou.content}"</p>,
      img: s.cover.imageSlot,
    },
    {
      badge: "08 · Next steps",
      title: s.actionItems.title,
      body: (
        <ul className="space-y-1.5 text-sm">
          {s.actionItems.items.slice(0, 3).map((a, i) => (
            <li key={i} className="flex gap-2"><span className={cn("font-bold", t.accent)}>{i + 1}.</span>{a.task}</li>
          ))}
        </ul>
      ),
      img: s.memoryCard.imageSlot,
    },
    {
      badge: "09 · Memory",
      title: s.memoryCard.title,
      body: (
        <div>
          <p className={cn("text-base font-semibold leading-snug", t.title)}>"{s.memoryCard.oneLiner}"</p>
          <p className="mt-2 text-xs text-muted-foreground">Remember: {s.memoryCard.rememberThis}</p>
        </div>
      ),
      img: s.memoryCard.imageSlot,
    },
  ];

  const scroll = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: "smooth" });
  };

  const cardW = intensity === "bold" ? "w-[320px]" : intensity === "calm" ? "w-[260px]" : "w-[290px]";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Swipe or use arrows · {cards.length} cards</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => scroll(-1)} aria-label="Previous"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => scroll(1)} aria-label="Next"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4"
        style={{ scrollbarWidth: "thin" }}
      >
        {cards.map((c, i) => (
          <div
            key={i}
            className={cn(
              cardW,
              "shrink-0 snap-start overflow-hidden bg-card",
              t.panel,
            )}
          >
            <ImageSlot slot={c.img} className="rounded-none border-0 border-b" />
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className={cn("inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest", t.sticker)}>
                  {c.badge}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">#{String(i + 1).padStart(2, "0")}/{cards.length}</span>
              </div>
              <h3 className={cn("text-base", t.title)}>{c.title}</h3>
              {c.body}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// shared
// ============================================================
function ActionMeta({ a }: { a: { owner: string; deadline: string } }) {
  return (
    <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{a.owner}</span>
      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{a.deadline}</span>
    </div>
  );
}
