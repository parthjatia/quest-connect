import { createServerFn } from "@tanstack/react-start";
import {
  InputSchema,
  SIZE_FOR_SLOT,
  buildImagePrompt,
  openaiImage,
  openaiJson,
  type RecapImages,
} from "./visual-recap.server";

export type { RecapAiJson, RecapImages } from "./visual-recap.server";

export const generateVisualRecap = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    const recap = await openaiJson(apiKey, data.transcript, data.preferences, data.templateId);

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

    const slots: (keyof RecapImages)[] = [
      "coverHero",
      "keyMoment_1",
      "finalMemory",
      "bigPictureScene",
      "keyMoment_2",
      "keyMoment_3",
    ];

    const results = await Promise.all(
      slots.map((slot) =>
        openaiImage(
          apiKey,
          buildImagePrompt(slot, promptSources[slot], data.preferences),
          SIZE_FOR_SLOT[slot],
        ).then((url) => [slot, url] as const),
      ),
    );

    const images: RecapImages = {
      coverHero: null,
      bigPictureScene: null,
      keyMoment_1: null,
      keyMoment_2: null,
      keyMoment_3: null,
      finalMemory: null,
    };
    for (const [slot, url] of results) images[slot] = url;

    return { recap, images };
  });
