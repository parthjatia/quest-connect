import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImageSlot as ImageSlotType } from "@/lib/recap-generator";

const RATIO_CLASS: Record<string, string> = {
  "16:9": "aspect-video",
  "4:3": "aspect-[4/3]",
  "1:1": "aspect-square",
};

const STYLE_GRADIENTS: Record<string, string> = {
  storybook: "from-amber-500/20 via-orange-400/10 to-rose-400/20",
  hero: "from-lime/30 via-cyan-500/15 to-fuchsia-500/20",
  manga: "from-fuchsia-500/25 via-violet-500/15 to-amber-400/20",
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
