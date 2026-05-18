// Lightweight storage for the Personalized Recap flow.
// Uses localStorage so it persists across reloads.
export type RecapPrefs = {
  purpose?: string;
  flow?: string;
  tone?: string;
  world?: string;
  format?: string;
  intensity?: string;
};

const TRANSCRIPT_KEY = "recapTranscript";
const PREFS_KEY = "recapPrefs";

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
