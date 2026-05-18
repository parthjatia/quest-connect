import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { generateEventWrapped } from "@/lib/wrapped.functions";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/wrapped")({
  head: () => ({ meta: [{ title: "Event Wrapped — EventQuest" }] }),
  component: WrappedPage,
});

type Wrapped = { story: string; image_url: string; points: number; cached: boolean };

function WrappedPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const gen = useServerFn(generateEventWrapped);
  const [data, setData] = useState<Wrapped | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const run = async () => {
    setBusy(true);
    try {
      const res = await gen();
      setData(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="relative mx-auto max-w-3xl px-4 py-12">
        <div className="absolute inset-0 -z-10 halftone opacity-20" />

        {!data ? (
          <div className="text-center py-20">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight" style={{ fontFamily: "Bangers, sans-serif" }}>
              YOUR EVENT WRAPPED
            </h1>
            <p className="mt-4 text-muted-foreground max-w-md mx-auto">
              Unlock your personalized comic recap — a Hero's Journey paragraph and a one-of-one illustration of your event.
            </p>
            <Button onClick={run} disabled={busy} size="lg" className="mt-8 bg-gradient-hero shadow-glow">
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Summoning…</> : <><Sparkles className="mr-2 h-4 w-4" />Generate my wrapped</>}
            </Button>
          </div>
        ) : (
          <article className="space-y-6">
            <div className="text-center">
              <p className="text-sm uppercase tracking-[0.3em] text-accent">Issue #001</p>
              <h1 className="mt-2 text-5xl font-bold" style={{ fontFamily: "Bangers, sans-serif" }}>
                {data.points} POINTS OF GLORY
              </h1>
            </div>

            {data.image_url ? (
              <div className="comic-border rounded-md overflow-hidden bg-black">
                <img src={data.image_url} alt="Your hero illustration" className="w-full aspect-square object-cover" />
              </div>
            ) : (
              <div className="comic-border rounded-md aspect-square grid place-items-center bg-gradient-card">
                <p className="text-muted-foreground text-sm">(illustration unavailable)</p>
              </div>
            )}

            <div className="comic-border rounded-md bg-card p-6 relative">
              <div className="absolute -top-3 left-6 px-3 py-1 bg-accent text-accent-foreground font-bold text-xs uppercase rounded">
                The Story
              </div>
              <p className="whitespace-pre-line leading-relaxed text-lg">{data.story}</p>
            </div>

            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => { setData(null); }}>
                <RefreshCw className="mr-2 h-4 w-4" />Re-roll
              </Button>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
