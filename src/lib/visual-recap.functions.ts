import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PrefsSchema = z.object({
  purpose: z.string().optional(),
  flow: z.string().optional(),
  tone: z.string().optional(),
  world: z.string().optional(),
  format: z.string().optional(),
  intensity: z.string().optional(),
});

const InputSchema = z.object({
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

function buildImagePrompt(slotName: string, source: string, prefs: z.infer<typeof PrefsSchema>) {
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

const SIZE_FOR_SLOT: Record<string, "1024x1024" | "1536x1024" | "1024x1536"> = {
  coverHero: "1536x1024",
  bigPictureScene: "1536x1024",
  keyMoment_1: "1024x1024",
  keyMoment_2: "1024x1024",
  keyMoment_3: "1024x1024",
  finalMemory: "1536x1024",
};

async function openaiJson(apiKey: string, transcript: string, prefs: z.infer<typeof PrefsSchema>, templateId: string): Promise<RecapAiJson> {
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

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
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
    throw new Error(`AI gateway text error ${res.status}: ${txt.slice(0, 300)}`);
  }
  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? "{}";
  const cleaned = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  const parsed = JSON.parse(cleaned);
  parsed.templateId = templateId;
  return parsed as RecapAiJson;
}

async function openaiImage(apiKey: string, prompt: string, _size: "1024x1024" | "1536x1024" | "1024x1536"): Promise<string | null> {
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
    if (!res.ok) {
      console.error("AI gateway image error", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const json = await res.json();
    const msg = json?.choices?.[0]?.message;
    const url: string | undefined =
      msg?.images?.[0]?.image_url?.url ??
      msg?.images?.[0]?.url ??
      undefined;
    return url ?? null;
  } catch (e) {
    console.error("AI gateway image exception", e);
    return null;
  }
}


export const generateVisualRecap = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");


    // 1. Text recap
    const recap = await openaiJson(apiKey, data.transcript, data.preferences, data.templateId);

    // 2. Build prompts from real recap content
    const km = recap.sections.keyMoments?.items ?? [];
    const moment = (i: number) => {
      const m = km[i];
      return m ? `${m.label}: ${m.summary}` : `key moment ${i + 1}`;
    };
    const promptSources: Record<keyof RecapImages, string> = {
      coverHero: `${recap.sections.cover.headline}. ${recap.sections.bigPicture.content}`.slice(0, 600),
      bigPictureScene: recap.sections.bigPicture.content.slice(0, 600),
      keyMoment_1: moment(0).slice(0, 400),
      keyMoment_2: moment(1).slice(0, 400),
      keyMoment_3: moment(2).slice(0, 400),
      finalMemory: recap.sections.memoryCard.rememberThis.slice(0, 400),
    };

    // 3. Generate prioritized images in parallel; cover, km1, finalMemory first
    const priority: (keyof RecapImages)[] = ["coverHero", "keyMoment_1", "finalMemory"];
    const secondary: (keyof RecapImages)[] = ["bigPictureScene", "keyMoment_2", "keyMoment_3"];

    const runOne = (slot: keyof RecapImages) =>
      openaiImage(
        apiKey,
        buildImagePrompt(slot, promptSources[slot], data.preferences),
        SIZE_FOR_SLOT[slot],
      ).then((url) => [slot, url] as const);

    const primaryResults = await Promise.all(priority.map(runOne));
    const secondaryResults = await Promise.all(secondary.map(runOne));

    const images: RecapImages = {
      coverHero: null,
      bigPictureScene: null,
      keyMoment_1: null,
      keyMoment_2: null,
      keyMoment_3: null,
      finalMemory: null,
    };
    for (const [slot, url] of [...primaryResults, ...secondaryResults]) {
      images[slot] = url;
    }

    return { recap, images };
  });
