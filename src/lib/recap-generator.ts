import type { RecapPrefs } from "./recap-store";

export type ImageSlot = {
  name: string;
  slotName: string;
  size: string;
  recommendedSize: string;
  ratio: string;
  styleTag: string;
  purpose: string;
  prompt: string;
};

export type RecapData = {
  title: string;
  subtitle: string;
  templateId: string;
  toneLabel: string;
  flowLabel: string;
  purposeLabel: string;
  formatLabel: string;
  intensityLabel: string;
  worldLabel: string;
  imagePlan: ImageSlot[];
  sections: {
    cover: { headline: string; tagline: string; imageSlot: ImageSlot };
    bigPicture: { title: string; content: string; bullets: string[]; imageSlot: ImageSlot };
    keyMoments: {
      title: string;
      items: { label: string; summary: string; imageSlot: ImageSlot }[];
    };
    decisions: { title: string; items: string[]; empty: boolean };
    whatMattersToYou: { title: string; content: string };
    actionItems: {
      title: string;
      items: { task: string; owner: string; deadline: string }[];
      empty: boolean;
    };
    memoryCard: {
      title: string;
      oneLiner: string;
      rememberThis: string;
      imageSlot: ImageSlot;
    };
  };
};

// ------------- Transcript extraction -------------

function splitSentences(t: string): string[] {
  return t
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'\(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function clip(s: string, n: number) {
  s = s.trim();
  return s.length <= n ? s : s.slice(0, n - 1).replace(/[,;:\-]?\s+\S*$/, "") + "…";
}

const DECISION_RX = /\b(decid(ed|e)|agreed|aligned on|we'?ll go with|chose|choosing|approved|signed off|conclud(ed|e)|locked in)\b/i;
const ACTION_RX = /\b(next step|action item|todo|to-do|to do|follow ?up|will (send|share|draft|email|ship|build|create|set up|setup|schedule|book)|owner:|deadline|due (by|on)|by (eod|tomorrow|monday|tuesday|wednesday|thursday|friday|next week)|assigned to)\b/i;

function extractMatches(sentences: string[], rx: RegExp, max: number): string[] {
  const out: string[] = [];
  for (const s of sentences) {
    if (rx.test(s)) {
      out.push(clip(s, 180));
      if (out.length >= max) break;
    }
  }
  return out;
}

function pickEvenly<T>(arr: T[], count: number): T[] {
  if (arr.length === 0) return [];
  if (arr.length <= count) return arr.slice();
  const out: T[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor((i * arr.length) / count);
    out.push(arr[idx]);
  }
  return out;
}

function parseActionItem(s: string): { task: string; owner: string; deadline: string } {
  // owner: "X will ..." or "assigned to X"
  let owner = "You";
  const willMatch = s.match(/\b([A-Z][a-zA-Z]+)\s+will\s+/);
  if (willMatch) owner = willMatch[1];
  const assignMatch = s.match(/assigned to\s+([A-Z][a-zA-Z]+)/i);
  if (assignMatch) owner = assignMatch[1];

  let deadline = "Soon";
  const dl = s.match(/\b(by\s+(EOD|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|end of (week|month|quarter)|\w+ \d{1,2})|this (week|month)|tomorrow|today)\b/i);
  if (dl) deadline = dl[0].replace(/^by\s+/i, "");

  return { task: clip(s, 140), owner, deadline };
}

// ------------- Preference-driven shaping -------------

type Tone = "professional" | "friendly" | "playful";
type Purpose = "catchup" | "understanding" | "action";
type Flow = "bigPicture" | "stepByStep" | "examples";
type Intensity = "calm" | "balanced" | "bold";

function readPrefs(p: RecapPrefs) {
  const tone: Tone =
    p.tone === "Playful and energetic" ? "playful"
    : p.tone === "Friendly and simple" ? "friendly"
    : "professional";
  const purpose: Purpose =
    p.purpose === "Help me actually understand it" ? "understanding"
    : p.purpose === "Show me what to do next" ? "action"
    : "catchup";
  const flow: Flow =
    p.flow === "Step by step" ? "stepByStep"
    : p.flow === "Through examples and analogies" ? "examples"
    : "bigPicture";
  const intensity: Intensity =
    p.intensity === "Bold and dramatic" ? "bold"
    : p.intensity === "Calm and clean" ? "calm"
    : "balanced";
  return { tone, purpose, flow, intensity };
}

function toneWrap(s: string, tone: Tone): string {
  if (!s) return s;
  switch (tone) {
    case "playful":
      return s.endsWith("!") ? s : s.replace(/[.?]?$/, "!");
    case "friendly":
      return s;
    case "professional":
    default:
      return s;
  }
}

function headlineFor(transcript: string, tone: Tone, purpose: Purpose): string {
  const firstWords = transcript.trim().split(/\s+/).slice(0, 6).join(" ");
  const seed = firstWords ? clip(firstWords, 40) : "Your session";
  if (purpose === "action") {
    return tone === "playful" ? `Go-Time: ${seed}!` : `Action Plan — ${seed}`;
  }
  if (purpose === "understanding") {
    return tone === "playful" ? `Decoded: ${seed}!` : `Understanding ${seed}`;
  }
  return tone === "playful" ? `The Fast Cut: ${seed}!` : `The Recap — ${seed}`;
}

function buildBigPicture(
  sentences: string[],
  prefs: ReturnType<typeof readPrefs>,
  wordCount: number,
): { content: string; bullets: string[] } {
  const { purpose, flow, tone } = prefs;
  const lead = sentences.slice(0, 6);
  const head = lead.slice(0, 2).join(" ");

  let content = "";
  if (flow === "bigPicture") {
    content = `Across roughly ${wordCount} words, the through-line is this: ${clip(head, 220)}`;
  } else if (flow === "stepByStep") {
    content = `Step by step, the conversation moves: ${clip(lead.slice(0, 3).join(" → "), 240)}`;
  } else {
    content = `Think of it like this — ${clip(head, 220)} It's the same shape as choosing what to keep on a small table: a few things earn their spot.`;
  }

  if (purpose === "action") {
    content += tone === "playful" ? " Bottom line: there is work to do." : " The emphasis lands squarely on what to do next.";
  } else if (purpose === "understanding") {
    content += " The why matters more here than the what.";
  } else {
    content += tone === "playful" ? " That's the gist!" : " That's the short version.";
  }

  const bullets = pickEvenly(sentences, purpose === "catchup" ? 3 : flow === "stepByStep" ? 5 : 4)
    .map((s) => clip(s, 140));

  return { content: toneWrap(content, tone), bullets };
}

// ------------- Image prompt builder -------------

const WORLD_PROMPT: Record<string, string> = {
  storybook: "warm illustrated storybook style, soft watercolor textures, hand-drawn linework, cozy lighting",
  hero: "bold comic book style, halftone shading, dynamic angles, dramatic rim light, ink outlines",
  manga: "expressive manga style, screentones, dynamic speed lines, high contrast black and white with one accent color",
};

const INTENSITY_PROMPT: Record<string, string> = {
  calm: "minimal composition, generous negative space, muted palette, gentle mood",
  balanced: "balanced composition, confident palette, medium contrast",
  bold: "high-energy composition, saturated palette, strong contrast, dramatic perspective",
};

const SAFETY = "no readable text in image, no logos, no brand marks, no copyrighted characters, leave clear space at top for a UI text overlay";

function buildPrompt(subject: string, world: string, intensity: string): string {
  return `${subject}. ${WORLD_PROMPT[world] ?? WORLD_PROMPT.storybook}. ${INTENSITY_PROMPT[intensity] ?? INTENSITY_PROMPT.balanced}. ${SAFETY}.`;
}

function makeSlot(
  name: string,
  ratio: string,
  size: string,
  purpose: string,
  subject: string,
  world: string,
  intensity: string,
): ImageSlot {
  return {
    name,
    slotName: name,
    size,
    recommendedSize: size,
    ratio,
    styleTag: world,
    purpose,
    prompt: buildPrompt(subject, world, intensity),
  };
}

// ------------- Main generator -------------

export function generatePersonalizedRecap(
  transcript: string,
  preferences: RecapPrefs,
  templateId: string,
): RecapData {
  const prefs = readPrefs(preferences);
  const world = templateId.split("_")[1] ?? "storybook";
  const sentences = splitSentences(transcript);
  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;

  // Extract decisions & actions
  const decisionLines = extractMatches(sentences, DECISION_RX, 4);
  const actionLines = extractMatches(sentences, ACTION_RX, 5);

  // Key moments from different parts of the transcript
  const momentsBase = pickEvenly(sentences, 3);
  const momentLabels = prefs.flow === "stepByStep"
    ? ["Step 1", "Step 2", "Step 3"]
    : prefs.purpose === "action"
    ? ["Trigger", "Turning point", "Commitment"]
    : ["Open", "Pivot", "Land"];

  const headline = headlineFor(transcript, prefs.tone, prefs.purpose);
  const tagline = sentences[0]
    ? clip(sentences[0], 160)
    : "Your personalized recap, generated from what was actually said.";

  const big = buildBigPicture(sentences, prefs, wordCount);

  // Image slots with transcript-aware subjects
  const coverSubject = `editorial cover scene that evokes "${clip(headline, 80)}", symbolic objects only`;
  const bigSubject = `wide symbolic scene representing the main theme: ${clip(big.content, 120)}`;
  const momentSubjects = momentsBase.map((m, i) => `small symbolic vignette for moment ${i + 1}: ${clip(m, 90)}`);
  while (momentSubjects.length < 3) momentSubjects.push(`abstract symbolic vignette ${momentSubjects.length + 1}`);
  const finalSubject = prefs.purpose === "action"
    ? "a single object on a desk under a spotlight, suggesting commitment and a next step"
    : prefs.purpose === "understanding"
    ? "an open notebook with a single highlighted line, suggesting clarity"
    : "a quiet wide shot of an empty room after the event, suggesting reflection";

  const cover = makeSlot("coverHero", "4:3", "1024x768", "Cover identity image", coverSubject, world, prefs.intensity);
  const bigPic = makeSlot("bigPictureScene", "16:9", "1024x576", "Visual metaphor for the whole transcript", bigSubject, world, prefs.intensity);
  const k1 = makeSlot("keyMoment_1", "1:1", "768x768", "Symbolic image for key moment 1", momentSubjects[0], world, prefs.intensity);
  const k2 = makeSlot("keyMoment_2", "1:1", "768x768", "Symbolic image for key moment 2", momentSubjects[1], world, prefs.intensity);
  const k3 = makeSlot("keyMoment_3", "1:1", "768x768", "Symbolic image for key moment 3", momentSubjects[2], world, prefs.intensity);
  const finalImg = makeSlot("finalMemory", "16:9", "1024x576", "Final emotional recap visual", finalSubject, world, prefs.intensity);

  const imagePlan = [cover, bigPic, k1, k2, k3, finalImg];

  // What matters to you — shaped by purpose/tone
  const mattersBase = prefs.purpose === "action"
    ? "Cut through the noise: here is the smallest set of moves that actually changes the outcome."
    : prefs.purpose === "understanding"
    ? "The core idea worth holding onto: the conversation kept coming back to one underlying question, and that question is the real lesson."
    : "Here is the version you'd tell a friend in 30 seconds, with only what matters kept in.";
  const matters = prefs.tone === "playful" ? mattersBase.replace(/\.$/, " — that's it!") : mattersBase;

  // Decisions / actions content
  const decisions = decisionLines.length
    ? decisionLines
    : ["No clear decisions were detected in this transcript."];
  const actions = actionLines.length
    ? actionLines.map(parseActionItem)
    : [{ task: "No clear action items were detected.", owner: "—", deadline: "—" }];

  // Memory card
  const last = sentences[sentences.length - 1] ?? "";
  const oneLiner = last
    ? clip(last, 160)
    : "Your recap is ready.";
  const remember = decisionLines[0]
    ? clip(decisionLines[0], 100)
    : actionLines[0]
    ? clip(actionLines[0], 100)
    : sentences[0]
    ? clip(sentences[0], 100)
    : "What was actually said.";

  return {
    title: headline,
    subtitle: tagline,
    templateId,
    toneLabel: preferences.tone ?? "",
    flowLabel: preferences.flow ?? "",
    purposeLabel: preferences.purpose ?? "",
    formatLabel: preferences.format ?? "",
    intensityLabel: preferences.intensity ?? "",
    worldLabel: preferences.world ?? "",
    imagePlan,
    sections: {
      cover: { headline, tagline, imageSlot: cover },
      bigPicture: {
        title: prefs.flow === "stepByStep" ? "How it unfolded" : prefs.flow === "examples" ? "The analogy" : "Big picture",
        content: big.content,
        bullets: big.bullets,
        imageSlot: bigPic,
      },
      keyMoments: {
        title: prefs.flow === "stepByStep" ? "The steps" : "Key moments",
        items: [
          { label: momentLabels[0], summary: clip(momentsBase[0] ?? "—", 200), imageSlot: k1 },
          { label: momentLabels[1], summary: clip(momentsBase[1] ?? "—", 200), imageSlot: k2 },
          { label: momentLabels[2], summary: clip(momentsBase[2] ?? "—", 200), imageSlot: k3 },
        ],
      },
      decisions: {
        title: "Decisions / Changes",
        items: decisions,
        empty: decisionLines.length === 0,
      },
      whatMattersToYou: {
        title: "What matters to you",
        content: matters,
      },
      actionItems: {
        title: "Action items / Next steps",
        items: actions,
        empty: actionLines.length === 0,
      },
      memoryCard: {
        title: "Final memory card",
        oneLiner,
        rememberThis: remember,
        imageSlot: finalImg,
      },
    },
  };
}
