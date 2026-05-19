import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  questTitle: string;
  questEmoji?: string | null;
  points: number;
  photoUrl?: string | null;
  claimedAt?: string | null;
};

export function QuestSummaryModal({
  open, onClose, questTitle, questEmoji, points, photoUrl, claimedAt,
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

          <div className="border border-border p-3 text-sm">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Points</p>
            <p className="text-xl font-semibold text-lime mt-1">+{points}</p>
          </div>

          <div className="border border-border p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-lime mb-2">Pod submission</p>
            <p className="text-sm text-muted-foreground">
              Your group proof photo is saved above. Main-quest visual recaps use the organizer&apos;s event transcript.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
