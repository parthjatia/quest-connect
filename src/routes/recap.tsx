import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RecapTheme, ComicPanel, StickerBadge } from "@/components/recap/recap-theme";
import { loadTranscript, saveTranscript } from "@/lib/recap-store";

export const Route = createFileRoute("/recap")({
  head: () => ({
    meta: [
      { title: "Personalized Visual Recap — paste any transcript" },
      {
        name: "description",
        content:
          "Turn boring meeting notes, event transcripts, or talk summaries into a personalized comic-style recap.",
      },
    ],
  }),
  component: RecapInputPage,
});

function RecapInputPage() {
  const navigate = useNavigate();
  const [text, setText] = useState("");

  useEffect(() => {
    setText(loadTranscript());
  }, []);

  const handleNext = () => {
    saveTranscript(text);
    navigate({ to: "/recap/preferences" });
  };

  return (
    <RecapTheme>
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8 flex items-center gap-3">
          <StickerBadge color="var(--marigold)">Step 1 of 3</StickerBadge>
          <StickerBadge color="var(--sage)">Personalized Recap</StickerBadge>
        </div>

        <h1 className="mb-3 text-4xl font-black leading-tight md:text-5xl">
          Turn any transcript into your{" "}
          <span style={{ background: "var(--peach)", padding: "0 8px", borderRadius: 8 }}>
            personal visual recap
          </span>
          .
        </h1>
        <p className="mb-8 text-lg" style={{ color: "var(--ink-soft)" }}>
          Paste meeting notes, event transcripts, or talk summaries and transform them into a
          comic-style memory.
        </p>

        <ComicPanel className="mb-6">
          <label className="mb-3 block text-sm font-bold uppercase tracking-wide">
            Your transcript
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your transcript, meeting notes, or talk summary here…"
            className="min-h-[280px] w-full resize-y rounded-xl border-2 p-4 text-base outline-none focus:ring-4"
            style={{
              background: "var(--cream)",
              borderColor: "var(--ink)",
              color: "var(--ink)",
            }}
          />
          <div className="mt-3 flex items-center justify-between text-xs" style={{ color: "var(--ink-soft)" }}>
            <span>{text.trim().split(/\s+/).filter(Boolean).length} words</span>
            <span>Anything from 200 to 20,000 words works best</span>
          </div>
        </ComicPanel>

        <div className="mb-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-full border-2 border-dashed px-5 py-2 text-sm font-semibold opacity-70"
            style={{ borderColor: "var(--brown)", color: "var(--brown)", background: "transparent" }}
          >
            Upload transcript (coming soon)
          </button>
          <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
            .txt, .pdf, .docx — soon
          </span>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleNext}
            disabled={text.trim().length < 20}
            className="rounded-full border-[3px] px-7 py-3 text-base font-black uppercase tracking-wide transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: "var(--coral)",
              color: "var(--cream)",
              borderColor: "var(--ink)",
              boxShadow: "5px 5px 0 0 var(--ink)",
            }}
          >
            Next: Personalize →
          </button>
        </div>
      </div>
    </RecapTheme>
  );
}
