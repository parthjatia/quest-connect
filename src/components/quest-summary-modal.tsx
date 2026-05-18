import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  questTitle: string;
  questEmoji?: string | null;
  points: number;
  photoUrl?: string | null;
  transcriptUrl?: string | null;
  claimedAt?: string | null;
};

export function QuestSummaryModal({
  open, onClose, questTitle, questEmoji, points, photoUrl, transcriptUrl, claimedAt,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{questEmoji ?? "⭐"}</span> {questTitle}
          </DialogTitle>
          <DialogDescription>
            {claimedAt ? `Claimed ${new Date(claimedAt).toLocaleString()}` : "Quest summary"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {photoUrl ? (
            <img src={photoUrl} alt="proof" className="w-full max-h-72 object-cover border border-border" />
          ) : (
            <div className="w-full h-48 border border-dashed border-border grid place-items-center text-muted-foreground">
              <Sparkles className="h-8 w-8 text-lime" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-px bg-border border border-border text-sm">
            <div className="bg-background p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Points</p>
              <p className="text-xl font-semibold text-lime mt-1">+{points}</p>
            </div>
            <div className="bg-background p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Transcript</p>
              {transcriptUrl ? (
                <a href={transcriptUrl} target="_blank" rel="noreferrer" className="text-sm text-lime underline mt-1 inline-block">
                  Open .md
                </a>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">None uploaded</p>
              )}
            </div>
          </div>

          <div className="border border-border p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-lime mb-2">AI summary</p>
            <p className="text-sm text-muted-foreground italic">
              Placeholder summary — connect a real LLM in <code>src/components/quest-summary-modal.tsx</code> using
              the transcript and proof photo above.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
