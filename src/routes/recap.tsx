import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RecapShell } from "@/components/recap/recap-shell";
import { loadTranscript, saveTranscript } from "@/lib/recap-store";

export const Route = createFileRoute("/recap")({
  head: () => ({
    meta: [
      { title: "Personalized Visual Recap" },
      {
        name: "description",
        content:
          "Turn boring meeting notes or event transcripts into a personalized comic-style recap.",
      },
    ],
  }),
  component: RecapInputPage,
});

function RecapInputPage() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(loadTranscript());
  }, []);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleNext = () => {
    if (!text.trim()) {
      setError("Paste a transcript or upload a .txt file to continue.");
      return;
    }
    saveTranscript(text);
    navigate({ to: "/recap/preferences" });
  };

  const handleFile = async (file: File | undefined) => {
    setUploadError(null);
    if (!file) return;
    const isTxt = file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");
    if (!isTxt) {
      setUploadError("TXT upload only for now — paste other formats as text.");
      return;
    }
    const content = await file.text();
    setText(content);
    setError(null);
  };

  return (
    <RecapShell>
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="uppercase tracking-wider">Step 1 of 3</Badge>
        <Badge className="bg-primary/15 text-primary border border-primary/30 hover:bg-primary/15">
          Personalized Recap
        </Badge>
      </div>

      <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05] mb-3">
        Turn any transcript into your{" "}
        <span className="text-lime">personal visual recap</span>.
      </h1>
      <p className="text-muted-foreground text-base mb-10 max-w-xl">
        Paste meeting notes, event transcripts, or talk summaries and transform them into a
        comic-style memory tailored to how you learn.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-lime" /> Your transcript
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Paste your transcript, meeting notes, or talk summary here…"
            className="min-h-[280px] resize-y font-mono text-sm"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{wordCount} words</span>
            <span>Anything from 200 to 20,000 words works best</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
            <input
              ref={fileRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4" /> Upload .txt file
            </Button>
            <span className="text-xs text-muted-foreground">TXT upload only — PDF / audio coming soon</span>
          </div>
          {uploadError && (
            <p className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" /> {uploadError}
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="mt-4 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}

      <div className="mt-8 flex justify-end">
        <Button type="button" size="lg" onClick={handleNext}>
          Next: Personalize →
        </Button>
      </div>
    </RecapShell>
  );
}
