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
        "relative w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br backdrop-blur-sm",
        gradient,
        ratio,
        className,
      )}
    >
      <div className="absolute inset-0 shimmer opacity-40" />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.18) 0, transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.12) 0, transparent 45%)",
        }}
      />
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="relative flex h-full w-full flex-col items-center justify-center gap-1.5 p-4 text-center">
        <div className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/[0.06] backdrop-blur-md">
          <ImageIcon className="h-4 w-4 text-white/80" />
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85">
          {slot.name}
        </div>
        <div className="text-[10px] text-white/55">
          {slot.size} · {slot.ratio} · {slot.styleTag}
        </div>
      </div>
    </div>
  );
}
