import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/sponsor")({
  head: () => ({
    meta: [
      { title: "Quest Connect — Sponsor Radar" },
      { name: "description", content: "Find the right audience clusters and launch better event touchpoints." },
    ],
  }),
  component: SponsorPage,
});

function SponsorPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between text-sm">
          <Link to="/" className="font-semibold tracking-tight">Quest Connect</Link>
          <span className="text-muted-foreground">demo</span>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-lime text-xs uppercase tracking-[0.2em] mb-4">Sponsor</p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">
            Sponsor Radar
          </h1>
          <p className="text-muted-foreground mt-4 text-base">
            Find the right audience clusters and launch better event touchpoints.
          </p>
        </div>

        <div className="mt-12 border border-border bg-card p-8">
          <p className="text-sm text-muted-foreground">
            Sponsor dashboard coming soon.
          </p>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-4 text-xs text-muted-foreground">
          Back to <Link to="/" className="text-lime hover:underline">home</Link>.
        </div>
      </footer>
    </div>
  );
}
