import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { ReactNode } from "react";

export function RecapHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 font-extrabold tracking-tight">
          <span className="relative grid h-8 w-8 place-items-center rounded-xl bg-gradient-hero shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </span>
          <span className="text-gradient text-lg">Quey</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/profile"
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
          >
            Profile
          </Link>
          <Link
            to="/play"
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to event
          </Link>
        </div>
      </div>
    </header>
  );
}

export function RecapShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-gradient-glow" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <RecapHeader />
      <main className="relative flex-1 mx-auto w-full max-w-3xl px-6 py-12">{children}</main>
    </div>
  );
}
