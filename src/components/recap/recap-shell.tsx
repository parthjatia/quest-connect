import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { ReactNode } from "react";

export function RecapHeader() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          Quest Connect
        </Link>
        <Link
          to="/play"
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to event
        </Link>
      </div>
    </header>
  );
}

export function RecapShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <RecapHeader />
      <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-12">{children}</main>
    </div>
  );
}
