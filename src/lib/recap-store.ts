// Storage for the Personalized Recap flow.
export type RecapPrefs = {
  purpose?: string;
  flow?: string;
  tone?: string;
  world?: string;
  format?: string;
  intensity?: string;
};

const TRANSCRIPT_KEY = "recapTranscript";
const PREFS_KEY = "recapPreferences";
const TEMPLATE_KEY = "recapTemplateId";

export function saveTranscript(t: string) {
  if (typeof window !== "undefined") localStorage.setItem(TRANSCRIPT_KEY, t);
}
export function loadTranscript(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TRANSCRIPT_KEY) ?? "";
}
export function savePrefs(p: RecapPrefs) {
  if (typeof window !== "undefined") localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}
export function loadPrefs(): RecapPrefs {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
  } catch {
    return {};
  }
}
export function saveTemplateId(id: string) {
  if (typeof window !== "undefined") localStorage.setItem(TEMPLATE_KEY, id);
}
export function loadTemplateId(): string {
  if (typeof window === "undefined") return "catchup_storybook";
  return localStorage.getItem(TEMPLATE_KEY) ?? "catchup_storybook";
}

export type InfoMode = "catchup" | "understanding" | "action";
export type VisualMode = "storybook" | "hero" | "manga";

export function deriveInfoMode(purpose?: string): InfoMode {
  if (purpose === "Help me actually understand it") return "understanding";
  if (purpose === "Show me what to do next") return "action";
  return "catchup";
}
export function deriveVisualMode(world?: string): VisualMode {
  if (world === "Superhero comic") return "hero";
  if (world === "Manga / anime-inspired") return "manga";
  return "storybook";
}
export function deriveTemplateId(prefs: RecapPrefs): string {
  return `${deriveInfoMode(prefs.purpose)}_${deriveVisualMode(prefs.world)}`;
}
