import { Heart, Sparkles, Calendar, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ImageSlot } from "@/components/recap/image-slot";
import { cn } from "@/lib/utils";
import type { RecapData } from "@/lib/recap-generator";
import type { RecapPrefs } from "@/lib/recap-store";

type VisualMode = "storybook" | "hero" | "manga";

function visualTheme(mode: VisualMode) {
  switch (mode) {
    case "hero":
      return {
        panel: "border-2 border-lime/60 shadow-[6px_6px_0_0_hsl(var(--border))]",
        title: "uppercase tracking-tight",
        accent: "text-lime",
        sticker: "bg-lime text-primary-foreground",
      };
    case "manga":
      return {
        panel: "border border-dashed border-fuchsia-400/60 rotate-[-0.2deg]",
        title: "italic tracking-tight",
        accent: "text-fuchsia-400",
        sticker: "bg-fuchsia-500 text-white",
      };
    case "storybook":
    default:
      return {
        panel: "border border-amber-500/30 rounded-2xl",
        title: "tracking-tight",
        accent: "text-amber-400",
        sticker: "bg-amber-500 text-black",
      };
  }
}

export function RecapResult({ data, prefs }: { data: RecapData; prefs: RecapPrefs }) {
  const visualMode = (data.templateId.split("_")[1] ?? "storybook") as VisualMode;
  const theme = visualTheme(visualMode);
  const format = prefs.format ?? "Magazine / zine spread";

  return (
    <div>
      {/* Cover */}
      <Card className={cn("mb-6 overflow-hidden", theme.panel)}>
        <CardContent className="p-0">
          <ImageSlot slot={data.sections.cover.imageSlot} className="rounded-none border-0 border-b" />
          <div className="p-8 text-center">
            <div className={cn("mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest", theme.sticker)}>
              <Sparkles className="h-3 w-3" /> Issue #01
            </div>
            <h1 className={cn("text-4xl sm:text-5xl font-semibold leading-[1.05]", theme.title)}>
              {data.sections.cover.headline}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
              {data.sections.cover.tagline}
            </p>
          </div>
        </CardContent>
      </Card>

      <Panel theme={theme} number={2} title={data.sections.bigPicture.title}>
        <div className="grid gap-4 sm:grid-cols-[1fr_1.2fr] sm:items-center">
          <ImageSlot slot={data.sections.bigPicture.imageSlot} />
          <p className="text-lg leading-snug">{data.sections.bigPicture.content}</p>
        </div>
      </Panel>

      <Panel theme={theme} number={3} title={data.sections.keyMoments.title}>
        {format === "Collectible cards" ? (
          <div className="-mx-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-2 pb-2">
            {data.sections.keyMoments.items.map((m, i) => (
              <div key={i} className={cn("min-w-[260px] max-w-[280px] shrink-0 snap-start rounded-xl border bg-card p-3", theme.panel)}>
                <ImageSlot slot={m.imageSlot} className="mb-3" />
                <div className={cn("mb-1 text-[10px] font-semibold uppercase tracking-widest", theme.accent)}>
                  Moment · {m.label}
                </div>
                <p className="text-sm">{m.summary}</p>
              </div>
            ))}
          </div>
        ) : format === "Comic panels" ? (
          <div className="space-y-3">
            {data.sections.keyMoments.items.map((m, i) => (
              <div key={i} className={cn("overflow-hidden rounded-lg border-2", theme.panel)}>
                <ImageSlot slot={{ ...m.imageSlot, ratio: "16:9" }} className="rounded-none border-0 border-b" />
                <div className="flex items-start gap-3 p-3">
                  <span className={cn("rounded px-2 py-1 text-xs font-bold", theme.sticker)}>{m.label}</span>
                  <p className="text-sm">{m.summary}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {data.sections.keyMoments.items.map((m, i) => (
              <div key={i} className={cn("rounded-lg border bg-secondary/40 p-3", theme.panel)}>
                <ImageSlot slot={m.imageSlot} className="mb-3" />
                <div className={cn("mb-1 text-[10px] font-semibold uppercase tracking-widest", theme.accent)}>
                  {m.label}
                </div>
                <p className="text-sm">{m.summary}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel theme={theme} number={4} title={data.sections.decisions.title}>
        <div className="grid gap-3 sm:grid-cols-3">
          {data.sections.decisions.items.map((d, i) => (
            <div key={i} className="rounded-md border border-border bg-secondary/40 p-4">
              <div className={cn("mb-2 text-[10px] font-semibold uppercase tracking-wider", theme.accent)}>
                Decision {i + 1}
              </div>
              <p className="text-sm">{d}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel theme={theme} number={5} title={data.sections.whatMattersToYou.title}>
        <div className="flex items-start gap-3 rounded-md border border-border bg-secondary/40 p-4">
          <Heart className={cn("mt-0.5 h-4 w-4 shrink-0", theme.accent)} />
          <p className="text-sm leading-relaxed">{data.sections.whatMattersToYou.content}</p>
        </div>
      </Panel>

      <Panel theme={theme} number={6} title={data.sections.actionItems.title}>
        <ol className="space-y-2">
          {data.sections.actionItems.items.map((n, i) => (
            <li key={i} className="flex items-start gap-3 rounded-md border border-border bg-secondary/40 p-3">
              <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold", theme.sticker)}>
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{n.task}</p>
                <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{n.owner}</span>
                  <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{n.deadline}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Card className={cn("overflow-hidden", theme.panel)}>
        <CardContent className="p-0">
          <ImageSlot slot={data.sections.memoryCard.imageSlot} className="rounded-none border-0 border-b" />
          <div className="p-8">
            <div className={cn("mb-3 text-[10px] font-semibold uppercase tracking-widest", theme.accent)}>
              {data.sections.memoryCard.title}
            </div>
            <p className="text-xl sm:text-2xl font-semibold leading-snug">
              "{data.sections.memoryCard.oneLiner}"
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Remember this: <span className="text-foreground font-medium">{data.sections.memoryCard.rememberThis}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Panel({
  title,
  number,
  theme,
  children,
}: {
  title: string;
  number: number;
  theme: ReturnType<typeof visualTheme>;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("mb-6", theme.panel)}>
      <CardContent className="pt-6">
        <div className="mb-4 flex items-center gap-3">
          <span className={cn("grid h-7 w-7 place-items-center rounded-md text-xs font-bold", theme.sticker)}>
            {number}
          </span>
          <h2 className={cn("text-lg font-semibold", theme.title)}>{title}</h2>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
