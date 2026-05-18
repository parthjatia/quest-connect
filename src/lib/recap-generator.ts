import type { RecapPrefs } from "./recap-store";

export type ImageSlot = {
  name: string;
  size: string;
  ratio: string;
  styleTag: string;
  purpose: string;
};

export type RecapData = {
  title: string;
  subtitle: string;
  templateId: string;
  imagePlan: ImageSlot[];
  sections: {
    cover: { headline: string; tagline: string; imageSlot: ImageSlot };
    bigPicture: { title: string; content: string; imageSlot: ImageSlot };
    keyMoments: {
      title: string;
      items: { label: string; summary: string; imageSlot: ImageSlot }[];
    };
    decisions: { title: string; items: string[] };
    whatMattersToYou: { title: string; content: string };
    actionItems: {
      title: string;
      items: { task: string; owner: string; deadline: string }[];
    };
    memoryCard: {
      title: string;
      oneLiner: string;
      rememberThis: string;
      imageSlot: ImageSlot;
    };
  };
};

function pickFirstSentence(t: string): string {
  const s = t.trim().split(/(?<=[.!?])\s+/)[0] ?? "";
  return s.slice(0, 180);
}

export function generatePersonalizedRecap(
  transcript: string,
  preferences: RecapPrefs,
  templateId: string,
): RecapData {
  const visualMode = templateId.split("_")[1] ?? "storybook";
  const lead = pickFirstSentence(transcript) || "The room shifted when the real question landed.";
  const words = transcript.trim().split(/\s+/).length;

  const slot = (name: string, ratio: string, size: string, purpose: string): ImageSlot => ({
    name,
    size,
    ratio,
    styleTag: visualMode,
    purpose,
  });

  const imagePlan: ImageSlot[] = [
    slot("coverHero", "4:3", "1024x768", "Visual identity for the selected template"),
    slot("bigPictureScene", "16:9", "1024x576", "Visual metaphor of the whole transcript"),
    slot("keyMoment_1", "1:1", "768x768", "Symbolic image for key moment 1"),
    slot("keyMoment_2", "1:1", "768x768", "Symbolic image for key moment 2"),
    slot("keyMoment_3", "1:1", "768x768", "Symbolic image for key moment 3"),
    slot("finalMemory", "16:9", "1024x576", "Final emotional recap visual"),
  ];

  return {
    title: "The Day Ideas Collided",
    subtitle: "Your personal recap, rewritten through your lens",
    templateId,
    imagePlan,
    sections: {
      cover: {
        headline: "The Day Ideas Collided",
        tagline: lead,
        imageSlot: imagePlan[0],
      },
      bigPicture: {
        title: "Big Picture",
        content: `Across roughly ${words} words of conversation, one question kept resurfacing: who is this actually for? The whole room realigned around that single thread.`,
        imageSlot: imagePlan[1],
      },
      keyMoments: {
        title: "Key Moments",
        items: [
          {
            label: "09:14",
            summary: "Maya opens with the slide nobody expected — churn isn't the metric.",
            imageSlot: imagePlan[2],
          },
          {
            label: "10:02",
            summary: "Heated pricing debate. Sage takes the room with one sentence.",
            imageSlot: imagePlan[3],
          },
          {
            label: "11:30",
            summary: "Live demo crashes, then becomes the most honest moment of the day.",
            imageSlot: imagePlan[4],
          },
        ],
      },
      decisions: {
        title: "Decisions / Changes",
        items: [
          "Drop the enterprise tier for now",
          "Rewrite onboarding around the 'first win' moment",
          "Ship a public changelog by end of month",
        ],
      },
      whatMattersToYou: {
        title: "What Matters To You",
        content:
          "You care about clarity over hype. The 'first win' framing fits how you already think about activation, and the pricing debate mirrors the call you've been postponing.",
      },
      actionItems: {
        title: "Action Items / Next Steps",
        items: [
          { task: "Draft one-page memo on the new activation metric", owner: "You", deadline: "This week" },
          { task: "Reach out to Maya re: pricing follow-up", owner: "You", deadline: "Tomorrow" },
          { task: "Block 90 min Friday to redesign onboarding", owner: "You", deadline: "Friday" },
        ],
      },
      memoryCard: {
        title: "Final Memory Card",
        oneLiner: "You walked in skeptical. You left with one sentence that changes the next quarter.",
        rememberThis: "Who is this actually for?",
        imageSlot: imagePlan[5],
      },
    },
  };
}
