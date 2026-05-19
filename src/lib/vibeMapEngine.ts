// Vibe Map matching engine. Pure functions, deterministic.
import {
  Attendee, EventZone, EVENT_ZONES, AttendeeFilter,
} from "@/data/mockEventData";

export type HeatLevel = "cold" | "warm" | "hot" | "very-hot";

export type AttendeeMatch = {
  attendee: Attendee;
  score: number; // 0-100
  matchedReasons: string[];
};

export type ZoneAggregate = {
  zone: EventZone;
  matchingCount: number;       // visible + anonymous
  anonymousCount: number;
  totalScore: number;
  averageScore: number;
  topSharedTags: string[];
  topMatches: AttendeeMatch[]; // visible only, up to 3
  heatLevel: HeatLevel;
  intensity: number;           // 0-1 for coloring
};

export type SuggestedAction = {
  zone: EventZone;
  why: string;
  openingLine: string;
};

// ---- filter mapping ----
// Map each AttendeeFilter to a predicate over (otherUser, currentUser).
type FilterPredicate = (other: Attendee, me: Attendee) => boolean;

const has = (arr: string[], v: string) =>
  arr.some((x) => x.toLowerCase() === v.toLowerCase());

const FILTER_PREDICATES: Record<AttendeeFilter, FilterPredicate> = {
  "basketball":               (o) => has(o.interests, "basketball"),
  "startups":                 (o) => has(o.interests, "startups"),
  "AI":                       (o) => has(o.interests, "AI") || has(o.skills, "AI engineering"),
  "internships":              (o) => has(o.goals, "internship"),
  "design":                   (o) => has(o.interests, "design") || has(o.skills, "design"),
  "backend":                  (o) => has(o.skills, "backend"),
  "frontend":                 (o) => has(o.skills, "frontend"),
  "founder energy":           (o) => has(o.goals, "find cofounder") || has(o.personalityTags, "serious builder"),
  "beginner-friendly":        (o) => has(o.personalityTags, "beginner-friendly"),
  "same track":               (o, me) => o.track === me.track,
  "people I have not met yet":(o, me) => !me.metAttendeeIds.includes(o.id),
  "business":                 (o) => has(o.interests, "business") || has(o.skills, "business"),
  "product":                  (o) => has(o.skills, "product"),
  "cloud":                    (o) => has(o.interests, "cloud") || has(o.skills, "cloud"),
  "fintech":                  (o) => has(o.interests, "fintech") || o.track === "Fintech",
  "sports tech":              (o) => has(o.interests, "sports tech") || o.track === "Sports Tech",
  "gaming":                   (o) => has(o.interests, "gaming") || o.track === "Gaming",
  "robotics":                 (o) => has(o.interests, "robotics") || o.track === "Robotics",
  "consulting":               (o) => has(o.interests, "consulting"),
};

const FILTER_REASON: Record<AttendeeFilter, (o: Attendee) => string> = {
  "basketball":               () => "both into basketball",
  "startups":                 () => "both into startups",
  "AI":                       () => "both into AI",
  "internships":              () => "both looking for internships",
  "design":                   () => "design overlap",
  "backend":                  () => "backend skills overlap",
  "frontend":                 () => "frontend skills overlap",
  "founder energy":           () => "founder energy",
  "beginner-friendly":        () => "beginner-friendly vibe",
  "same track":               (o) => `same track (${o.track})`,
  "people I have not met yet":() => "you have not met yet",
  "business":                 () => "business overlap",
  "product":                  () => "product skills overlap",
  "cloud":                    () => "cloud overlap",
  "fintech":                  () => "fintech overlap",
  "sports tech":              () => "sports tech overlap",
  "gaming":                   () => "gaming overlap",
  "robotics":                 () => "robotics overlap",
  "consulting":               () => "consulting overlap",
};

const COMPLEMENTARY: Array<[string, string]> = [
  ["backend", "frontend"],
  ["backend", "design"],
  ["AI engineering", "design"],
  ["AI engineering", "business"],
  ["data science", "design"],
  ["product", "AI engineering"],
  ["pitching", "AI engineering"],
  ["marketing", "backend"],
  ["business", "AI engineering"],
];

function complementaryPairs(meSkills: string[], otherSkills: string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const [a, b] of COMPLEMENTARY) {
    if (has(meSkills, a) && has(otherSkills, b)) pairs.push([a, b]);
    else if (has(meSkills, b) && has(otherSkills, a)) pairs.push([b, a]);
  }
  return pairs;
}

function intersect(a: string[], b: string[]) {
  const lb = new Set(b.map((x) => x.toLowerCase()));
  return a.filter((x) => lb.has(x.toLowerCase()));
}

export function calculateAttendeeMatchScore(
  currentUser: Attendee,
  other: Attendee,
  selectedFilters: AttendeeFilter[],
): { score: number; matchedReasons: string[] } {
  if (other.id === currentUser.id) return { score: 0, matchedReasons: [] };
  if (other.discoveryVisibility === "hidden") return { score: 0, matchedReasons: [] };

  const reasons: string[] = [];

  // Filter matches (35%)
  let filterScore = 0;
  if (selectedFilters.length > 0) {
    let hits = 0;
    for (const f of selectedFilters) {
      if (FILTER_PREDICATES[f](other, currentUser)) {
        hits++;
        reasons.push(FILTER_REASON[f](other));
      }
    }
    filterScore = (hits / selectedFilters.length) * 35;
  } else {
    filterScore = 0;
  }

  // Shared interests (25%) — capped at 4
  const sharedInterests = intersect(currentUser.interests, other.interests);
  const interestScore = Math.min(sharedInterests.length, 4) / 4 * 25;
  if (sharedInterests.length > 0 && reasons.length < 6) {
    reasons.push(`shared interests: ${sharedInterests.slice(0, 3).join(", ")}`);
  }

  // Shared goals (15%)
  const sharedGoals = intersect(currentUser.goals, other.goals);
  const goalScore = Math.min(sharedGoals.length, 3) / 3 * 15;
  if (sharedGoals.length > 0) reasons.push(`shared goal: ${sharedGoals[0]}`);

  // Complementary skills (15%)
  const compl = complementaryPairs(currentUser.skills, other.skills);
  const complScore = Math.min(compl.length, 2) / 2 * 15;
  if (compl.length > 0) {
    const [mine, theirs] = compl[0];
    reasons.push(`you have ${mine}, they have ${theirs}`);
  }

  // Same track (5%)
  const trackScore = currentUser.track === other.track ? 5 : 0;
  if (trackScore > 0) reasons.push(`same track (${other.track})`);

  // Not-met bonus (5%)
  const notMet = !currentUser.metAttendeeIds.includes(other.id);
  const notMetScore = notMet ? 5 : 0;
  if (notMet) reasons.push("you have not met yet");

  const score = Math.round(filterScore + interestScore + goalScore + complScore + trackScore + notMetScore);
  // de-dupe reasons
  const seen = new Set<string>();
  const dedup = reasons.filter((r) => (seen.has(r) ? false : (seen.add(r), true)));
  return { score: Math.max(0, Math.min(100, score)), matchedReasons: dedup };
}

function heatLevelFor(avg: number, count: number): HeatLevel {
  if (count === 0) return "cold";
  if (avg >= 65 && count >= 4) return "very-hot";
  if (avg >= 50 && count >= 3) return "hot";
  if (avg >= 30 || count >= 2) return "warm";
  return "cold";
}

export function aggregateVibeMapZones(
  currentUser: Attendee,
  attendees: Attendee[],
  selectedFilters: AttendeeFilter[],
): ZoneAggregate[] {
  const byZone: Record<EventZone, AttendeeMatch[]> = Object.fromEntries(
    EVENT_ZONES.map((z) => [z, [] as AttendeeMatch[]]),
  ) as Record<EventZone, AttendeeMatch[]>;
  const anonByZone: Record<EventZone, number> = Object.fromEntries(
    EVENT_ZONES.map((z) => [z, 0]),
  ) as Record<EventZone, number>;

  for (const a of attendees) {
    if (a.id === currentUser.id) continue;
    if (a.discoveryVisibility === "hidden") continue;
    const { score, matchedReasons } = calculateAttendeeMatchScore(currentUser, a, selectedFilters);
    // We still count anyone meaningfully matched. With no filters, score>=15 from interests/goals.
    if (score < 15) continue;
    byZone[a.currentZone].push({ attendee: a, score, matchedReasons });
    if (a.discoveryVisibility === "anonymous") anonByZone[a.currentZone] += 1;
  }

  // Determine max for normalization
  const totals = EVENT_ZONES.map((z) => byZone[z].reduce((s, m) => s + m.score, 0));
  const maxTotal = Math.max(1, ...totals);

  return EVENT_ZONES.map((zone) => {
    const matches = byZone[zone].sort((a, b) => b.score - a.score);
    const total = matches.reduce((s, m) => s + m.score, 0);
    const avg = matches.length ? Math.round(total / matches.length) : 0;

    // Top shared tags across matches (their interests overlapping current user)
    const tagCount = new Map<string, number>();
    for (const m of matches) {
      const shared = intersect(currentUser.interests, m.attendee.interests);
      for (const t of shared) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
      for (const t of m.attendee.personalityTags.slice(0, 2)) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
    }
    const topSharedTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]);

    const visibleTop = matches
      .filter((m) => m.attendee.discoveryVisibility === "visible")
      .slice(0, 3);

    return {
      zone,
      matchingCount: matches.length,
      anonymousCount: anonByZone[zone],
      totalScore: total,
      averageScore: avg,
      topSharedTags,
      topMatches: visibleTop,
      heatLevel: heatLevelFor(avg, matches.length),
      intensity: Math.min(1, total / maxTotal),
    };
  }).sort(
    (a, b) =>
      b.totalScore - a.totalScore
      || b.matchingCount - a.matchingCount
      || b.averageScore - a.averageScore,
  );
}

export function generateAttendeeSuggestedAction(
  hottestZone: ZoneAggregate,
  selectedFilters: AttendeeFilter[],
): SuggestedAction | null {
  if (!hottestZone || hottestZone.matchingCount === 0) return null;

  const filterText = selectedFilters.length
    ? selectedFilters.slice(0, 2).join(" + ")
    : (hottestZone.topSharedTags.slice(0, 2).join(" + ") || "your vibe");

  const why = `${hottestZone.zone} is hot for ${filterText}. ${hottestZone.matchingCount} people match here${
    hottestZone.anonymousCount ? ` (${hottestZone.anonymousCount} anonymous)` : ""
  }.`;

  // Build an opening line from filters / shared tags
  const topic = selectedFilters[0] ?? hottestZone.topSharedTags[0] ?? "AI and startups";
  const secondary = selectedFilters[1] ?? hottestZone.topSharedTags[1];
  const openingLine = secondary
    ? `Anyone here into ${topic} or ${secondary}?`
    : `Anyone here into ${topic}?`;

  return { zone: hottestZone.zone, why, openingLine };
}
