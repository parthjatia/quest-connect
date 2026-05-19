// Sponsor Radar engine. Pure functions, deterministic.
import {
  Attendee, EventZone, EVENT_ZONES, SponsorGoal, SponsorTargetFilter,
} from "@/data/mockEventData";
import { HeatLevel } from "@/lib/vibeMapEngine";

export type SponsorMatch = {
  attendee: Attendee;
  score: number;             // 0-100
  matchedReasons: string[];
  showName: boolean;         // visible + sponsorOpen
};

export type SponsorZoneAggregate = {
  zone: EventZone;
  highFitCount: number;      // score >= 50
  totalCount: number;        // any score > 0
  anonymousCount: number;
  totalScore: number;
  averageScore: number;
  dominantSkills: string[];
  dominantGoals: string[];
  dominantInterests: string[];
  dominantTraits: string[];
  visibleMatches: SponsorMatch[]; // only visible+sponsorOpen, top 4
  heatLevel: HeatLevel;
  intensity: number;
};

export type SponsorAction = {
  zone: EventZone;
  recommended: string;
  boothActivation: string;
  questIdea: string;
  why: string;
};

export type SponsorQuest = {
  id: string;
  title: string;
  description: string;
  zone: EventZone;
  goal: SponsorGoal;
  targetFilters: SponsorTargetFilter[];
  rewardPoints: number;
  status: "Live demo quest";
  ctaText: string;
};

const has = (arr: string[], v: string) =>
  arr.some((x) => x.toLowerCase() === v.toLowerCase());

// ---- target filter predicates ----
type TargetPredicate = (a: Attendee) => boolean;
const TARGET_PREDICATES: Record<SponsorTargetFilter, TargetPredicate> = {
  "AI beginners":              (a) => (has(a.interests, "AI") || a.track === "AI") && has(a.personalityTags, "beginner-friendly"),
  "technical builders":        (a) => has(a.personalityTags, "technical") || has(a.personalityTags, "serious builder"),
  "backend devs":              (a) => has(a.skills, "backend"),
  "frontend devs":             (a) => has(a.skills, "frontend"),
  "business students":         (a) => has(a.interests, "business") || has(a.skills, "business"),
  "founders":                  (a) => has(a.goals, "find cofounder") || a.track === "Startup",
  "designers":                 (a) => has(a.skills, "design"),
  "fintech":                   (a) => a.track === "Fintech" || has(a.interests, "fintech"),
  "sports tech":               (a) => a.track === "Sports Tech" || has(a.interests, "sports tech"),
  "cloud":                     (a) => has(a.skills, "cloud") || has(a.interests, "cloud"),
  "robotics":                  (a) => a.track === "Robotics" || has(a.interests, "robotics"),
  "consulting":                (a) => has(a.interests, "consulting"),
  "product people":            (a) => has(a.skills, "product"),
  "pitch people":              (a) => has(a.skills, "pitching") || has(a.skills, "public speaking"),
  "students seeking internships": (a) => has(a.goals, "internship"),
  "high quest activity":       (a) => a.questActivityScore >= 75,
  "sponsor-open attendees":    (a) => a.sponsorOpen,
};

const TARGET_REASON: Record<SponsorTargetFilter, string> = {
  "AI beginners": "AI beginner",
  "technical builders": "technical builder",
  "backend devs": "backend dev",
  "frontend devs": "frontend dev",
  "business students": "business student",
  "founders": "founder energy",
  "designers": "designer",
  "fintech": "fintech focus",
  "sports tech": "sports tech focus",
  "cloud": "cloud skills",
  "robotics": "robotics focus",
  "consulting": "consulting interest",
  "product people": "product skills",
  "pitch people": "strong pitcher",
  "students seeking internships": "seeking internships",
  "high quest activity": "high quest activity",
  "sponsor-open attendees": "open to sponsors",
};

// ---- scoring weights per sponsor goal ----
// Returns { score: 0-100, reasons: string[] }
function goalScore(a: Attendee, goal: SponsorGoal): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let s = 0;
  switch (goal) {
    case "hiring": {
      const skillHit = ["backend","frontend","AI engineering","cloud","data science","design","product"]
        .some((k) => has(a.skills, k));
      if (skillHit) { s += 40; reasons.push("relevant technical skills"); }
      if (has(a.goals, "internship")) { s += 20; reasons.push("career-seeking"); }
      if (a.sponsorOpen) { s += 20; reasons.push("open to sponsors"); }
      s += Math.round((a.questActivityScore / 100) * 20);
      if (a.questActivityScore >= 70) reasons.push("highly engaged");
      break;
    }
    case "internships": {
      if (has(a.goals, "internship")) { s += 45; reasons.push("looking for internship"); }
      if (has(a.personalityTags, "beginner-friendly") || has(a.personalityTags, "curious")) { s += 20; reasons.push("student energy"); }
      if (a.sponsorOpen) { s += 20; reasons.push("open to sponsors"); }
      const skillHit = ["backend","frontend","AI engineering","cloud","data science","design"]
        .some((k) => has(a.skills, k));
      if (skillHit) { s += 15; reasons.push("relevant skills"); }
      break;
    }
    case "product feedback": {
      const builder = has(a.personalityTags, "serious builder") || has(a.personalityTags, "creative")
        || has(a.skills, "product") || has(a.skills, "design");
      if (builder) { s += 30; reasons.push("builder / product mindset"); }
      if (a.questActivityScore >= 70) { s += 35; reasons.push("actively engaging"); }
      const broad = a.interests.some((i) => ["AI","design","fintech","sports tech","gaming","cloud","robotics"].includes(i));
      if (broad) { s += 20; reasons.push("relevant interests"); }
      if (has(a.goals, "get product feedback") || has(a.goals, "build something impressive")) { s += 15; reasons.push("ships things"); }
      break;
    }
    case "brand awareness": {
      s += Math.round((a.questActivityScore / 100) * 45);
      if (a.questActivityScore >= 60) reasons.push("active at event");
      if (has(a.personalityTags, "extrovert") || has(a.personalityTags, "connector")) { s += 25; reasons.push("connector personality"); }
      if (a.interests.length >= 3) { s += 15; reasons.push("broad interests"); }
      if (has(a.goals, "create content")) { s += 15; reasons.push("creates content"); }
      break;
    }
    case "startup leads": {
      if (has(a.goals, "find cofounder") || a.track === "Startup") { s += 40; reasons.push("founder energy"); }
      const pitch = has(a.skills, "pitching") || has(a.skills, "business") || has(a.skills, "design") || has(a.skills, "product");
      if (pitch) { s += 25; reasons.push("can pitch / build"); }
      if (a.sponsorOpen) { s += 20; reasons.push("open to sponsors"); }
      if (has(a.interests, "startups") || has(a.interests, "business")) { s += 15; reasons.push("startup interest"); }
      break;
    }
    case "student ambassadors": {
      if (has(a.personalityTags, "extrovert") || has(a.personalityTags, "connector")) { s += 35; reasons.push("connector personality"); }
      s += Math.round((a.questActivityScore / 100) * 30);
      if (a.questActivityScore >= 65) reasons.push("active at event");
      if (a.sponsorOpen) { s += 20; reasons.push("open to sponsors"); }
      if (has(a.goals, "make friends") || has(a.goals, "create content")) { s += 15; reasons.push("social / content energy"); }
      break;
    }
  }
  return { score: Math.max(0, Math.min(100, Math.round(s))), reasons };
}

export function calculateSponsorFitScore(
  attendee: Attendee,
  sponsorGoal: SponsorGoal,
  sponsorTargetFilters: SponsorTargetFilter[],
): { score: number; matchedReasons: string[]; showName: boolean } {
  if (attendee.discoveryVisibility === "hidden") {
    return { score: 0, matchedReasons: [], showName: false };
  }

  const { score: gs, reasons: gReasons } = goalScore(attendee, sponsorGoal);

  let targetScore = 0;
  const tReasons: string[] = [];
  if (sponsorTargetFilters.length > 0) {
    let hits = 0;
    for (const f of sponsorTargetFilters) {
      if (TARGET_PREDICATES[f](attendee)) {
        hits++;
        tReasons.push(TARGET_REASON[f]);
      }
    }
    targetScore = (hits / sponsorTargetFilters.length) * 100;
  }

  // Blend: 60% goal, 40% target (or 100% goal when no filters)
  const blended = sponsorTargetFilters.length > 0
    ? Math.round(gs * 0.6 + targetScore * 0.4)
    : gs;

  const showName = attendee.discoveryVisibility === "visible" && attendee.sponsorOpen;

  // Dedupe reasons
  const seen = new Set<string>();
  const reasons = [...tReasons, ...gReasons].filter((r) => (seen.has(r) ? false : (seen.add(r), true)));

  return { score: Math.max(0, Math.min(100, blended)), matchedReasons: reasons, showName };
}

function topN(items: string[], n: number) {
  const c = new Map<string, number>();
  for (const x of items) c.set(x, (c.get(x) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map((e) => e[0]);
}

function heatLevelFor(avg: number, count: number): HeatLevel {
  if (count === 0) return "cold";
  if (avg >= 65 && count >= 4) return "very-hot";
  if (avg >= 50 && count >= 3) return "hot";
  if (avg >= 30 || count >= 2) return "warm";
  return "cold";
}

export function aggregateSponsorZones(
  attendees: Attendee[],
  sponsorGoal: SponsorGoal,
  sponsorTargetFilters: SponsorTargetFilter[],
): SponsorZoneAggregate[] {
  const byZone: Record<EventZone, SponsorMatch[]> = Object.fromEntries(
    EVENT_ZONES.map((z) => [z, [] as SponsorMatch[]]),
  ) as Record<EventZone, SponsorMatch[]>;
  const anonByZone: Record<EventZone, number> = Object.fromEntries(
    EVENT_ZONES.map((z) => [z, 0]),
  ) as Record<EventZone, number>;

  for (const a of attendees) {
    if (a.discoveryVisibility === "hidden") continue;
    const { score, matchedReasons, showName } = calculateSponsorFitScore(a, sponsorGoal, sponsorTargetFilters);
    if (score < 20) continue;
    byZone[a.currentZone].push({ attendee: a, score, matchedReasons, showName });
    if (a.discoveryVisibility === "anonymous") anonByZone[a.currentZone] += 1;
  }

  const totals = EVENT_ZONES.map((z) => byZone[z].reduce((s, m) => s + m.score, 0));
  const maxTotal = Math.max(1, ...totals);

  return EVENT_ZONES.map((zone) => {
    const matches = byZone[zone].sort((a, b) => b.score - a.score);
    const total = matches.reduce((s, m) => s + m.score, 0);
    const avg = matches.length ? Math.round(total / matches.length) : 0;
    const highFit = matches.filter((m) => m.score >= 50).length;

    const skills = matches.flatMap((m) => m.attendee.skills);
    const goals  = matches.flatMap((m) => m.attendee.goals);
    const interests = matches.flatMap((m) => m.attendee.interests);
    const traits = matches.flatMap((m) => m.attendee.personalityTags);

    const visible = matches.filter((m) => m.showName).slice(0, 4);

    return {
      zone,
      highFitCount: highFit,
      totalCount: matches.length,
      anonymousCount: anonByZone[zone],
      totalScore: total,
      averageScore: avg,
      dominantSkills: topN(skills, 3),
      dominantGoals: topN(goals, 3),
      dominantInterests: topN(interests, 3),
      dominantTraits: topN(traits, 3),
      visibleMatches: visible,
      heatLevel: heatLevelFor(avg, matches.length),
      intensity: Math.min(1, total / maxTotal),
    };
  }).sort(
    (a, b) =>
      b.totalScore - a.totalScore
      || b.highFitCount - a.highFitCount
      || b.averageScore - a.averageScore,
  );
}

// ---- Action + quest generators (deterministic, depend on zone + goal + filters) ----

const GOAL_ACTION: Record<SponsorGoal, (z: SponsorZoneAggregate) => Omit<SponsorAction, "zone" | "why">> = {
  "hiring": (z) => ({
    recommended: `Send one recruiter to ${z.zone} for a 10-minute open Q&A on roles.`,
    boothActivation: "Resume drop with a 60-second 'why you' video booth.",
    questIdea: "Pitch yourself in 30 seconds to the sponsor rep.",
  }),
  "internships": (z) => ({
    recommended: `Run a 5-minute career Q&A at ${z.zone}.`,
    boothActivation: "Express-application station for summer internships.",
    questIdea: "Ask the sponsor one question about their internship program.",
  }),
  "product feedback": (z) => ({
    recommended: `Pull 4–6 builders from ${z.zone} for a 10-minute feedback round.`,
    boothActivation: "Tabletop demo + sticky-note feedback wall.",
    questIdea: "Give one piece of feedback on the sponsor's product idea.",
  }),
  "brand awareness": (z) => ({
    recommended: `Drop a small swag activation at ${z.zone} during the next break.`,
    boothActivation: "Photo wall + branded sticker pack.",
    questIdea: "Take a team photo at the sponsor booth with someone you just met.",
  }),
  "startup leads": (z) => ({
    recommended: `Walk one partner through ${z.zone} and intro founders.`,
    boothActivation: "1:1 founder office-hours sign-up sheet.",
    questIdea: "Pitch a startup idea related to the sponsor's industry in 60 seconds.",
  }),
  "student ambassadors": (z) => ({
    recommended: `Recruit 2–3 connectors from ${z.zone} as ambassadors today.`,
    boothActivation: "Ambassador application + a free hoodie for sign-ups.",
    questIdea: "Bring two people to the sponsor booth and ask one question together.",
  }),
};

export function generateSponsorAction(
  hottest: SponsorZoneAggregate,
  sponsorGoal: SponsorGoal,
  targetFilters: SponsorTargetFilter[],
): SponsorAction | null {
  if (!hottest || hottest.totalCount === 0) return null;
  const base = GOAL_ACTION[sponsorGoal](hottest);

  const traits = [
    ...hottest.dominantTraits.slice(0, 2),
    ...hottest.dominantInterests.slice(0, 2),
  ].filter(Boolean);

  const filterText = targetFilters.length ? targetFilters.slice(0, 2).join(" + ") : "your audience";
  const traitText = traits.length ? ` Dominant traits: ${traits.join(", ")}.` : "";
  const why = `${hottest.zone} has ${hottest.highFitCount} high-fit attendees for "${sponsorGoal}" (${filterText}).${traitText}`;

  return { zone: hottest.zone, ...base, why };
}

const QUEST_BANK: Record<SponsorGoal, string[]> = {
  "hiring": [
    "Ask the sponsor one question about internships",
    "Show the sponsor one project you have built",
    "Pitch yourself in 30 seconds",
  ],
  "internships": [
    "Ask the sponsor about their internship timeline",
    "Show one project that proves you can ship",
    "Introduce another internship-seeker to the sponsor",
  ],
  "product feedback": [
    "Give feedback on the sponsor's product idea",
    "Suggest one AI use case for the sponsor",
    "Find one bug or rough edge in the sponsor's demo",
  ],
  "brand awareness": [
    "Visit the sponsor booth with someone you just met",
    "Take a team photo at the sponsor booth",
    "Tag the sponsor in a 15-second event recap",
  ],
  "startup leads": [
    "Pitch a startup idea related to the sponsor's industry",
    "Find a founder and bring them to the sponsor booth",
    "Trade one founder intro with the sponsor",
  ],
  "student ambassadors": [
    "Bring two people to the sponsor booth and ask one question together",
    "Create a 15-second sponsor recap with your pod",
    "Sign up one new ambassador from your university",
  ],
};

export function generateSponsorQuest(
  sponsorGoal: SponsorGoal,
  targetFilters: SponsorTargetFilter[],
  hottest: SponsorZoneAggregate | null,
): SponsorQuest | null {
  if (!hottest) return null;
  const bank = QUEST_BANK[sponsorGoal];
  // Deterministic pick: combine length of filters + zone name length + highFit count
  const seed =
    sponsorGoal.length +
    targetFilters.reduce((s, f) => s + f.length, 0) +
    hottest.zone.length +
    hottest.highFitCount;
  const title = bank[seed % bank.length];

  const dominant = [
    ...hottest.dominantInterests.slice(0, 2),
    ...hottest.dominantTraits.slice(0, 1),
  ].filter(Boolean);
  const flavor = dominant.length ? ` Tuned for ${dominant.join(", ")} crowd in ${hottest.zone}.` : ` Run at ${hottest.zone}.`;

  const rewardPoints = 75 + (seed % 4) * 25;

  return {
    id: `sq-${sponsorGoal}-${hottest.zone}-${seed}`,
    title,
    description: `${title}.${flavor}`,
    zone: hottest.zone,
    goal: sponsorGoal,
    targetFilters: [...targetFilters],
    rewardPoints,
    status: "Live demo quest",
    ctaText: "Complete at the sponsor booth to earn points",
  };
}
