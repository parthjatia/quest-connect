import { z } from "zod";

export const PrefsSchema = z.object({
  purpose: z.string().optional(),
  flow: z.string().optional(),
  tone: z.string().optional(),
  world: z.string().optional(),
  format: z.string().optional(),
  intensity: z.string().optional(),
});

export const InputSchema = z.object({
  transcript: z.string().min(1).max(120_000),
  preferences: PrefsSchema,
  templateId: z.string().min(1).max(64),
});

export type RecapAiJson = {
  title: string;
  subtitle: string;
  templateId: string;
  sections: {
    cover: { headline: string; tagline: string };
    bigPicture: { title: string; content: string };
    keyMoments: { title: string; items: { label: string; summary: string }[] };
    decisions: { title: string; items: string[] };
    whatMattersToYou: { title: string; content: string };
    actionItems: { title: string; items: { task: string; owner: string; deadline: string }[] };
    memoryCard: { title: string; oneLiner: string; rememberThis: string };
  };
};

export type RecapImages = {
  coverHero: string | null;
  bigPictureScene: string | null;
  keyMoment_1: string | null;
  keyMoment_2: string | null;
  keyMoment_3: string | null;
  finalMemory: string | null;
};

const WORLD_DESC: Record<string, string> = {
  "Animated storybook": "soft, charming, illustrated, warm storybook style with hand-drawn linework",
  "Superhero comic": "bold dramatic superhero comic energy, halftone shading, dynamic angles",
  "Manga / anime-inspired": "expressive manga/anime style, dynamic linework, screentones, high contrast with one accent color",
};
const INTENSITY_DESC: Record<string, string> = {
  "Calm and clean": "softer composition, simpler shapes, generous whitespace",
  "Balanced and expressive": "rich but controlled composition, confident palette",
  "Bold and dramatic": "high-energy striking composition, saturated palette, strong contrast",
};

export type Prefs = z.infer<typeof PrefsSchema>;

export function buildImagePrompt(slotName: string, source: string, prefs: Prefs) {
  const world = WORLD_DESC[prefs.world ?? ""] ?? WORLD_DESC["Animated storybook"];
  const intensity = INTENSITY_DESC[prefs.intensity ?? ""] ?? INTENSITY_DESC["Balanced and expressive"];
  return [
    `Create a visual illustration for a personalized transcript recap.`,
    `Slot: ${slotName}.`,
    `Source content to visualize: ${source}.`,
    `Visual world: ${world}.`,
    `Visual intensity: ${intensity}.`,
    `Layout format: ${prefs.format ?? "Magazine / zine spread"}.`,
    `Represent the actual source content, not a generic event scene.`,
    `No readable text inside the image. No logos. No copyrighted characters.`,
    `Leave clean space at the top for a text overlay. Use symbolic storytelling and visual clarity.`,
  ].join(" ");
}

export const SIZE_FOR_SLOT: Record<string, "1024x1024" | "1536x1024" | "1024x1536"> = {
  coverHero: "1536x1024",
  bigPictureScene: "1536x1024",
  keyMoment_1: "1024x1024",
  keyMoment_2: "1024x1024",
  keyMoment_3: "1024x1024",
  finalMemory: "1536x1024",
};

export async function openaiJson(
  apiKey: string,
  transcript: string,
  prefs: Prefs,
  templateId: string,
): Promise<RecapAiJson> {
  const sys = `You generate a personalized visual recap as STRICT JSON.

Rules:
- Summarize ONLY what is in the transcript. Do not invent facts, names, dates, or decisions.
- If no decisions are found, set decisions.items to ["No explicit decisions were made."].
- If no action items are found, set actionItems.items to [{ "task": "No clear action items were mentioned.", "owner": "—", "deadline": "—" }].
- Always return exactly 3 key moments. If the transcript is short, infer the open/pivot/land structure from what's available.
- Adapt to user preferences:
  - Recap goal "Catch me up fast" = concise high-signal summary.
  - "Help me actually understand it" = clearer explanations and context.
  - "Show me what to do next" = emphasize actions, decisions, follow-ups.
  - Tone "Clear and professional" = clean wording.
  - Tone "Friendly and simple" = warm and easy wording.
  - Tone "Playful and energetic" = punchy and memorable wording.
- "whatMattersToYou" should reframe one specific point from the transcript through the lens of the user's recap goal.
- Keep cover.headline under 60 characters. Keep memoryCard.oneLiner under 90 characters.
- Output ONLY the JSON object, no prose, no markdown.`;

  const user = `User preferences:
- recapGoal: ${prefs.purpose ?? "—"}
- explanationFlow: ${prefs.flow ?? "—"}
- tone: ${prefs.tone ?? "—"}
- visualWorld: ${prefs.world ?? "—"}
- format: ${prefs.format ?? "—"}
- visualIntensity: ${prefs.intensity ?? "—"}
- templateId: ${templateId}

Transcript:
"""
${transcript.slice(0, 16000)}
"""

Return JSON matching this schema exactly:
{
  "title": "string",
  "subtitle": "string",
  "templateId": "${templateId}",
  "sections": {
    "cover": { "headline": "string", "tagline": "string" },
    "bigPicture": { "title": "string", "content": "string" },
    "keyMoments": { "title": "string", "items": [ {"label":"string","summary":"string"}, {"label":"string","summary":"string"}, {"label":"string","summary":"string"} ] },
    "decisions": { "title": "string", "items": ["string"] },
    "whatMattersToYou": { "title": "string", "content": "string" },
    "actionItems": { "title": "string", "items": [ {"task":"string","owner":"string","deadline":"string"} ] },
    "memoryCard": { "title": "string", "oneLiner": "string", "rememberThis": "string" }
  }
}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.7,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI text error ${res.status}: ${txt.slice(0, 300)}`);
  }
  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  parsed.templateId = templateId;
  return parsed as RecapAiJson;
}

export async function openaiImage(
  apiKey: string,
  prompt: string,
  size: "1024x1024" | "1536x1024" | "1024x1536",
): Promise<string | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size,
        n: 1,
      }),
    });
    if (!res.ok) {
      console.error("OpenAI image error", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const json = await res.json();
    const b64: string | undefined = json?.data?.[0]?.b64_json;
    if (!b64) return null;
    return `data:image/png;base64,${b64}`;
  } catch (e) {
    console.error("OpenAI image exception", e);
    return null;
  }
}
