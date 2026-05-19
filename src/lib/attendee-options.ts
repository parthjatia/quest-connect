export const TRACK_OPTIONS = [
  { value: "ai_for_business", label: "AI for Business" },
  { value: "creative_marketing", label: "Creative / Marketing Tech" },
  { value: "dev_tools_infra", label: "Dev Tools / Infrastructure" },
  { value: "fintech_payments", label: "Fintech / Payments" },
  { value: "health_sustainability", label: "Health & Sustainability" },
  { value: "open_track", label: "Open track (no theme)" },
] as const;

export const GOAL_OPTIONS = [
  { value: "working_product", label: "A working product" },
  { value: "job_internship", label: "Job / internship" },
  { value: "experience", label: "Just the experience" },
  { value: "new_connections", label: "New connections" },
] as const;

export type TrackIntent = typeof TRACK_OPTIONS[number]["value"];
export type EventGoal = typeof GOAL_OPTIONS[number]["value"];

export const trackLabel = (v: string | null | undefined) =>
  TRACK_OPTIONS.find((o) => o.value === v)?.label ?? v ?? "—";
export const goalLabel = (v: string | null | undefined) =>
  GOAL_OPTIONS.find((o) => o.value === v)?.label ?? v ?? "—";

export const trackValueFromLabel = (label: string | null | undefined): TrackIntent | null => {
  if (!label) return null;
  const norm = label.trim().toLowerCase();
  return (TRACK_OPTIONS.find((o) => o.label.toLowerCase() === norm)?.value as TrackIntent) ?? null;
};
export const goalValueFromLabel = (label: string | null | undefined): EventGoal | null => {
  if (!label) return null;
  const norm = label.trim().toLowerCase();
  return (GOAL_OPTIONS.find((o) => o.label.toLowerCase() === norm)?.value as EventGoal) ?? null;
};
