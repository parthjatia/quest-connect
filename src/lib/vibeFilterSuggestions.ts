/**
 * Vibe Map filter suggestions from attendee profile.
 * Pure functions — always run locally; AI is optional enhancement on top.
 */
import {
  ATTENDEE_FILTERS, Attendee, AttendeeFilter,
} from "@/data/mockEventData";
import { arrHasAny, fieldsHaveAny } from "@/lib/attendeeMatching";

export type FilterSuggestion = {
  filter: AttendeeFilter;
  reason: string;
};

export type ProfileFilterResult = {
  filters: AttendeeFilter[];
  suggestions: FilterSuggestion[];
};

const ALLOWED = new Set<string>(ATTENDEE_FILTERS);

/** Deterministic mapping from profile fields → vibe map filters. */
export function suggestFiltersFromProfile(attendee: Attendee): ProfileFilterResult {
  const suggestions: FilterSuggestion[] = [];
  const seen = new Set<AttendeeFilter>();

  const add = (filter: AttendeeFilter, reason: string) => {
    if (seen.has(filter)) return;
    seen.add(filter);
    suggestions.push({ filter, reason });
  };

  const interests = attendee.interests;
  const goals = attendee.goals;
  const skills = attendee.skills;
  const looking = attendee.lookingFor;
  const tags = attendee.personalityTags;
  const track = attendee.track;

  if (arrHasAny(interests, "AI") || track.toLowerCase().includes("ai")) {
    add("AI", "AI shows up in your profile");
  }
  if (fieldsHaveAny(interests, goals, looking, "startup", "startups", "founder", "cofounder")) {
    add("startups", "Startup / builder energy in your profile");
  }
  if (fieldsHaveAny(goals, looking, "internship", "job", "career", "hiring")) {
    add("internships", "Career / internship goals in your profile");
  }
  if (arrHasAny(skills, "design") || arrHasAny(interests, "design")) {
    add("design", "Design overlap in your profile");
  }
  if (arrHasAny(skills, "backend")) add("backend", "Backend skills on your profile");
  if (arrHasAny(skills, "frontend")) add("frontend", "Frontend skills on your profile");
  if (arrHasAny(skills, "product")) add("product", "Product skills on your profile");
  if (arrHasAny(interests, "cloud") || arrHasAny(skills, "cloud")) add("cloud", "Cloud focus in your profile");
  if (arrHasAny(interests, "fintech") || track.toLowerCase().includes("fintech")) {
    add("fintech", "Fintech track or interests");
  }
  if (arrHasAny(interests, "sports tech", "basketball") || track.toLowerCase().includes("sports")) {
    add("sports tech", "Sports / sports tech in your profile");
  }
  if (arrHasAny(interests, "gaming") || track.toLowerCase().includes("gaming")) {
    add("gaming", "Gaming interest on your profile");
  }
  if (arrHasAny(interests, "robotics") || track.toLowerCase().includes("robotics")) {
    add("robotics", "Robotics focus in your profile");
  }
  if (fieldsHaveAny(interests, goals, "business", "consulting")) {
    add("business", "Business / consulting angle in your profile");
  }
  if (arrHasAny(interests, "consulting")) add("consulting", "Consulting interest on your profile");
  if (fieldsHaveAny(goals, tags, looking, "founder", "cofounder", "builder")) {
    add("founder energy", "Founder / builder goals or tags");
  }
  if (fieldsHaveAny(tags, goals, "beginner", "beginner-friendly", "curious")) {
    add("beginner-friendly", "Beginner-friendly vibe on your profile");
  }
  if (arrHasAny(interests, "basketball")) add("basketball", "Basketball in your interests");

  add("same track", "People on the same track as you");
  if (attendee.metAttendeeIds.length < 5) {
    add("people I have not met yet", "Expand your network at the event");
  }

  const capped = suggestions.slice(0, 6);
  return {
    filters: capped.map((s) => s.filter),
    suggestions: capped,
  };
}

/** Keep only valid attendee filters; preserve order; dedupe. */
export function sanitizeFilterList(raw: unknown): AttendeeFilter[] {
  if (!Array.isArray(raw)) return [];
  const out: AttendeeFilter[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim() as AttendeeFilter;
    if (!ALLOWED.has(trimmed)) continue;
    if (out.includes(trimmed)) continue;
    out.push(trimmed);
  }
  return out.slice(0, 6);
}

/** Parse AI JSON or bulleted list fallback. */
export function parseAiFilterPayload(text: string): AttendeeFilter[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  try {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { filters?: unknown };
      return sanitizeFilterList(parsed.filters);
    }
  } catch {
    // fall through
  }

  const found: AttendeeFilter[] = [];
  for (const f of ATTENDEE_FILTERS) {
    if (trimmed.toLowerCase().includes(f.toLowerCase())) found.push(f);
  }
  return sanitizeFilterList(found);
}

/** Merge profile + AI lists: profile first, then AI additions, max 6. */
export function mergeFilterSuggestions(
  profile: AttendeeFilter[],
  ai: AttendeeFilter[],
): AttendeeFilter[] {
  const out = [...profile];
  for (const f of ai) {
    if (!out.includes(f)) out.push(f);
    if (out.length >= 6) break;
  }
  return out.slice(0, 6);
}

export function profileSnapshotForAi(attendee: Attendee): string {
  return [
    `Name: ${attendee.name}`,
    `University: ${attendee.university}`,
    `Track: ${attendee.track}`,
    `Interests: ${attendee.interests.join(", ") || "—"}`,
    `Goals: ${attendee.goals.join(", ") || "—"}`,
    `Skills: ${attendee.skills.join(", ") || "—"}`,
    `Looking for: ${attendee.lookingFor.join(", ") || "—"}`,
    `Personality: ${attendee.personalityTags.join(", ") || "—"}`,
  ].join("\n");
}
