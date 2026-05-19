import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImageSlot as ImageSlotType } from "@/lib/recap-generator";

const RATIO_CLASS: Record<string, string> = {
  "16:9": "aspect-video",
  "4:3": "aspect-[4/3]",
  "1:1": "aspect-square",
};

const STYLE_GRADIENTS: Record<string, string> = {
  storybook: "from-blue-500/25 via-cyan-400/10 to-violet-500/20",
  hero: "from-primary/30 via-cyan-400/15 to-blue-500/25",
  manga: "from-violet-500/25 via-fuchsia-500/15 to-cyan-400/20",
};

export function ImageSlot({
  slot,
  className,
}: {
  slot: ImageSlotType;
  className?: string;
}) {
  const ratio = RATIO_CLASS[slot.ratio] ?? "aspect-video";
  const gradient = STYLE_GRADIENTS[slot.styleTag] ?? STYLE_GRADIENTS.storybook;

  if (slot.imageUrl) {
    return (
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-lg border border-border bg-card",
          ratio,
          className,
        )}
      >
        <img
          src={slot.imageUrl}
          alt={slot.purpose}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg border border-border bg-gradient-to-br",
        gradient,
        ratio,
        className,
      )}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.1) 0, transparent 40%)",
        }}
      />
      <div className="relative flex h-full w-full flex-col items-center justify-center gap-1 p-4 text-center">
        <ImageIcon className="h-5 w-5 text-foreground/60" />
        <div className="text-[10px] font-semibold uppercase tracking-widest text-foreground/70">
          AI image slot: {slot.name}
        </div>
        <div className="text-[10px] text-foreground/50">
          {slot.size} · {slot.ratio} · {slot.styleTag}
        </div>
      </div>
    </div>
  );
}
