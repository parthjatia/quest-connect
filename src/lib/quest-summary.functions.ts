import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CHAPTER_COUNT = 7;

const PrefsSchema = z.object({
  purpose: z.string().optional(),
  flow: z.string().optional(),
  tone: z.string().optional(),
  visualStyle: z.enum(["Straightforward", "Anime", "Marvel / DC comic-like"]),
});

const InputSchema = z.object({
  transcript: z.string().min(1).max(120_000),
  questTitle: z.string().min(1).max(200),
  preferences: PrefsSchema,
});

export type QuestSummaryPrefs = z.infer<typeof PrefsSchema>;

export type QuestChapter = {
  part: number;
  title: string;
  summary: string;
  imageUrl: string | null;
};

export type QuestChapterRecap = {
  questTitle: string;
  chapters: QuestChapter[];
};

const VISUAL_STYLE_DESC: Record<QuestSummaryPrefs["visualStyle"], string> = {
  Straightforward:
    "clean editorial illustration, realistic proportions, clear storytelling, minimal stylization",
  Anime: "expressive anime/manga style, dynamic linework, screentones, high contrast",
  "Marvel / DC comic-like":
    "bold American superhero comic energy, halftone shading, dramatic angles, cinematic panels",
};

type ChapterJson = {
  part: number;
  title: string;
  summary: string;
  imageScene: string;
};

async function openaiChapters(
  apiKey: string,
  transcript: string,
  questTitle: string,
  prefs: QuestSummaryPrefs,
): Promise<ChapterJson[]> {
  const sys = `You split event conversation transcripts into exactly ${CHAPTER_COUNT} sequential chapters for a personalized visual recap.

Rules:
- Use ONLY content from the transcript. Do not invent facts, names, or events.
- Chapters must be in chronological order and cover the full transcript evenly.
- Each summary is 2-4 sentences, shaped by the user's recap preferences.
- imageScene: a vivid visual description for an illustrator (no readable text in the image).
- part: integers 1 through ${CHAPTER_COUNT}.
- Output ONLY valid JSON: { "chapters": [ ... ] }`;

  const user = `Quest: ${questTitle}
Preferences:
- recapGoal: ${prefs.purpose ?? "Catch me up fast"}
- explanationFlow: ${prefs.flow ?? "Big picture first"}
- tone: ${prefs.tone ?? "Clear and professional"}
- visualStyle: ${prefs.visualStyle}

Transcript:
"""
${transcript.slice(0, 16000)}
"""

Return JSON:
{
  "chapters": [
    { "part": 1, "title": "string", "summary": "string", "imageScene": "string" }
  ]
}
Exactly ${CHAPTER_COUNT} chapters.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      response_format: { type: "json_object" },
      temperature: 0.6,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI text error ${res.status}: ${txt.slice(0, 300)}`);
  }
  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? "{}";
  const cleaned = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  const parsed = JSON.parse(cleaned) as { chapters?: ChapterJson[] };
  const chapters = (parsed.chapters ?? []).slice(0, CHAPTER_COUNT);
  while (chapters.length < CHAPTER_COUNT) {
    const n = chapters.length + 1;
    chapters.push({
      part: n,
      title: `Part ${n}`,
      summary: "This section had limited transcript content.",
      imageScene: `Abstract visual for part ${n} of ${questTitle}`,
    });
  }
  return chapters.map((c, i) => ({ ...c, part: i + 1 }));
}

async function openaiImage(apiKey: string, prompt: string): Promise<string | null> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const msg = json?.choices?.[0]?.message;
    return msg?.images?.[0]?.image_url?.url ?? msg?.images?.[0]?.url ?? null;
  } catch {
    return null;
  }
}

function buildImagePrompt(chapter: ChapterJson, prefs: QuestSummaryPrefs, questTitle: string) {
  const style = VISUAL_STYLE_DESC[prefs.visualStyle];
  return [
    `Comic-style panel for the event quest "${questTitle}", chapter ${chapter.part}: ${chapter.title}.`,
    `Scene: ${chapter.imageScene}.`,
    `Visual style: ${style}.`,
    `Single illustrated panel. No readable text. No logos. No copyrighted characters.`,
  ].join(" ");
}

export const generateQuestChapterRecap = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const chapterJson = await openaiChapters(apiKey, data.transcript, data.questTitle, data.preferences);

    const imageResults = await Promise.all(
      chapterJson.map((ch) =>
        openaiImage(apiKey, buildImagePrompt(ch, data.preferences, data.questTitle)).then((url) => ({
          part: ch.part,
          url,
        })),
      ),
    );
    const imageByPart = new Map(imageResults.map((r) => [r.part, r.url]));

    const chapters: QuestChapter[] = chapterJson.map((ch) => ({
      part: ch.part,
      title: ch.title,
      summary: ch.summary,
      imageUrl: imageByPart.get(ch.part) ?? null,
    }));

    return { questTitle: data.questTitle, chapters } satisfies QuestChapterRecap;
  });
