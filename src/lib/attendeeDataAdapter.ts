import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  Attendee, CURRENT_USER, DiscoveryVisibility, EVENT_ZONES, EventZone, MOCK_ATTENDEES,
} from "@/data/mockEventData";
import { trackLabel, goalLabel } from "@/lib/attendee-options";

export type DbAttendeeRow = Database["public"]["Tables"]["attendees"]["Row"];

export type LiveAttendeeResult = {
  attendees: Attendee[];
  source: "live" | "fallback";
  usedClientEnrichment: boolean;
  error?: string;
};

const ATTENDEE_SELECT =
  "id, user_id, full_name, university, age, country, track, track_intent, event_goal, academic_background, ai_experience, points, interests, goals, skills, personality_tags, current_zone, discovery_visibility, sponsor_open, met_attendee_ids, quest_activity_score, looking_for, hobbies, linkedin_url, github_url";

const ZONES = EVENT_ZONES as readonly string[];

const ENRICH_PACKS: Array<{
  interests: string[];
  goals: string[];
  skills: string[];
  personalityTags: string[];
  lookingFor: string[];
}> = [
  { interests: ["AI", "startups", "cloud"], goals: ["internship", "make friends"], skills: ["backend", "AI engineering"], personalityTags: ["curious", "connector"], lookingFor: ["AI mentors", "internship"] },
  { interests: ["design", "startups", "education"], goals: ["find cofounder", "talk to sponsors"], skills: ["frontend", "design"], personalityTags: ["serious builder", "technical"], lookingFor: ["cofounder", "sponsors"] },
  { interests: ["fintech", "business", "consulting"], goals: ["learn AI", "build something impressive"], skills: ["business", "product"], personalityTags: ["strategic", "extrovert"], lookingFor: ["designers", "feedback"] },
  { interests: ["basketball", "sports tech", "startups"], goals: ["create content", "make friends"], skills: ["pitching", "marketing"], personalityTags: ["competitive", "creative"], lookingFor: ["sports tech people"] },
  { interests: ["gaming", "AI", "robotics"], goals: ["get product feedback", "win"], skills: ["cloud", "data science"], personalityTags: ["beginner-friendly", "curious"], lookingFor: ["teammates", "gaming friends"] },
  { interests: ["robotics", "AI", "cloud"], goals: ["talk to sponsors", "internship"], skills: ["backend", "cloud"], personalityTags: ["technical", "introvert"], lookingFor: ["robotics builders"] },
  { interests: ["sustainability", "design", "startups"], goals: ["find cofounder", "build something impressive"], skills: ["design", "product"], personalityTags: ["connector", "chill"], lookingFor: ["impact founders"] },
  { interests: ["consulting", "business", "fintech"], goals: ["make friends", "just survive socially"], skills: ["public speaking", "business"], personalityTags: ["extrovert", "strategic"], lookingFor: ["consulting people"] },
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function parseStringArray(value: Json | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v.trim() : String(v)))
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "??";
  return parts.map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export function normalizeEventZone(zone: string | null | undefined): EventZone {
  const z = (zone ?? "").trim();
  const hit = ZONES.find((x) => x.toLowerCase() === z.toLowerCase());
  return (hit ?? "Middle Left") as EventZone;
}

function normalizeVisibility(v: string | null | undefined): DiscoveryVisibility {
  const x = (v ?? "visible").toLowerCase();
  if (x === "anonymous" || x === "hidden") return x;
  return "visible";
}

function mapAiExperience(exp: DbAttendeeRow["ai_experience"]): string[] {
  if (!exp) return [];
  if (exp === "beginner") return ["beginner-friendly"];
  if (exp === "intermediate" || exp === "power_user") return ["technical"];
  return [];
}

function needsEnrichment(row: DbAttendeeRow): boolean {
  return (
    parseStringArray(row.interests).length === 0
    || parseStringArray(row.goals).length === 0
    || parseStringArray(row.skills).length === 0
  );
}

function enrichFromRow(row: DbAttendeeRow, base: Attendee): Attendee {
  const pack = ENRICH_PACKS[hashId(row.id) % ENRICH_PACKS.length];
  const fromGoal = row.event_goal ? goalLabel(row.event_goal) : undefined;
  const fromBg = row.academic_background?.trim();
  const fromTrack = row.track_intent ? trackLabel(row.track_intent) : (row.track?.trim() || undefined);

  const interests = base.interests.length
    ? base.interests
    : [...pack.interests, ...(fromTrack ? [fromTrack] : [])];

  const goals = base.goals.length
    ? base.goals
    : fromGoal ? [fromGoal, ...pack.goals] : pack.goals;

  const skills = base.skills.length
    ? base.skills
    : fromBg ? [fromBg, ...pack.skills] : pack.skills;

  const personalityTags = [
    ...new Set([...base.personalityTags, ...mapAiExperience(row.ai_experience), ...pack.personalityTags]),
  ];

  const lookingFor = base.lookingFor.length ? base.lookingFor : pack.lookingFor;

  const track = base.track || fromTrack || "Startup";

  const questActivityScore = base.questActivityScore > 0
    ? base.questActivityScore
    : Math.min(100, Math.max(0, row.points ?? 0));

  return {
    ...base,
    interests: [...new Set(interests)],
    goals: [...new Set(goals)],
    skills: [...new Set(skills)],
    personalityTags,
    lookingFor: [...new Set(lookingFor)],
    track,
    questActivityScore,
  };
}

export function dbRowToAttendee(row: DbAttendeeRow, options?: { enrich?: boolean }): Attendee {
  const name = (row.full_name ?? "").trim() || "Attendee";
  const base: Attendee = {
    id: row.id,
    name,
    initials: initialsFromName(name),
    university: (row.university ?? "").trim() || "—",
    interests: parseStringArray(row.interests),
    goals: parseStringArray(row.goals),
    skills: parseStringArray(row.skills),
    track: (row.track?.trim() || (row.track_intent ? trackLabel(row.track_intent) : "")) || "Startup",
    personalityTags: [
      ...new Set([
        ...parseStringArray(row.personality_tags),
        ...mapAiExperience(row.ai_experience),
      ]),
    ],
    currentZone: normalizeEventZone(row.current_zone),
    discoveryVisibility: normalizeVisibility(typeof row.discovery_visibility === "boolean" ? (row.discovery_visibility ? "public" : "private") : (row.discovery_visibility as string | null | undefined)),
    sponsorOpen: row.sponsor_open ?? true,
    metAttendeeIds: parseStringArray(row.met_attendee_ids),
    questActivityScore: row.quest_activity_score ?? Math.min(100, row.points ?? 0),
    lookingFor: parseStringArray(row.looking_for),
  };

  if (row.event_goal && !base.goals.some((g) => normEq(g, goalLabel(row.event_goal)))) {
    base.goals.push(goalLabel(row.event_goal));
  }
  if (row.academic_background?.trim() && !base.skills.some((s) => normEq(s, row.academic_background!))) {
    base.skills.push(row.academic_background.trim());
  }

  const enrich = options?.enrich !== false;
  if (enrich && needsEnrichment(row)) {
    return enrichFromRow(row, base);
  }
  return base;
}

function normEq(a: string, b: string) {
  return a.toLowerCase().trim() === b.toLowerCase().trim();
}

export async function fetchLiveAttendees(): Promise<LiveAttendeeResult> {
  try {
    const { data, error } = await supabase
      .from("attendees")
      .select(ATTENDEE_SELECT)
      .order("full_name", { ascending: true });

    if (error) throw error;
    if (!data?.length) {
      return { attendees: MOCK_ATTENDEES, source: "fallback", usedClientEnrichment: false, error: "No rows" };
    }

    let usedClientEnrichment = false;
    const attendees = data.map((row) => {
      const needs = needsEnrichment(row as DbAttendeeRow);
      if (needs) usedClientEnrichment = true;
      return dbRowToAttendee(row as DbAttendeeRow, { enrich: true });
    });

    return { attendees, source: "live", usedClientEnrichment };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Fetch failed";
    return {
      attendees: MOCK_ATTENDEES,
      source: "fallback",
      usedClientEnrichment: false,
      error: message,
    };
  }
}

export async function fetchAttendeeById(id: string): Promise<Attendee | null> {
  try {
    const { data, error } = await supabase
      .from("attendees")
      .select(ATTENDEE_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return dbRowToAttendee(data as DbAttendeeRow, { enrich: true });
  } catch {
    return null;
  }
}

export async function updateAttendeeZone(attendeeId: string, zone: EventZone): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("attendees")
    .update({ current_zone: zone, updated_at: new Date().toISOString() })
    .eq("id", attendeeId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Resolve current user for Vibe Map: local session → first visible → mock demo user. */
export function resolveDemoCurrentUser(
  attendees: Attendee[],
  sessionId: string | null,
  fetched: Attendee | null,
): { user: Attendee; isDemoStandIn: boolean } {
  if (fetched) return { user: fetched, isDemoStandIn: false };
  if (sessionId) {
    const fromList = attendees.find((a) => a.id === sessionId);
    if (fromList) return { user: fromList, isDemoStandIn: false };
  }
  const visible = attendees.find((a) => a.discoveryVisibility === "visible");
  if (visible) return { user: visible, isDemoStandIn: true };
  if (attendees[0]) return { user: attendees[0], isDemoStandIn: true };
  return { user: CURRENT_USER, isDemoStandIn: true };
}
