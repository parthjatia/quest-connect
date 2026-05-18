// Mock event data for Vibe Map + Sponsor Radar.
// Deterministic seed — change nothing here unless you also update tests.

export const EVENT_ZONES = [
  "Front Left",
  "Front Right",
  "Middle Left",
  "Middle Right",
  "Back Area",
  "Coffee Area",
  "Sponsor Booths",
  "Stage Area",
] as const;

export type EventZone = (typeof EVENT_ZONES)[number];

// 2D layout (relative %, 100x60 grid) for the floorplan svg.
export const ZONE_LAYOUT: Record<EventZone, { x: number; y: number; w: number; h: number }> = {
  "Stage Area":      { x: 5,  y: 4,  w: 90, h: 12 },
  "Front Left":      { x: 5,  y: 18, w: 42, h: 14 },
  "Front Right":     { x: 53, y: 18, w: 42, h: 14 },
  "Middle Left":     { x: 5,  y: 34, w: 42, h: 12 },
  "Middle Right":    { x: 53, y: 34, w: 42, h: 12 },
  "Back Area":       { x: 5,  y: 48, w: 56, h: 10 },
  "Coffee Area":     { x: 63, y: 48, w: 16, h: 10 },
  "Sponsor Booths":  { x: 81, y: 48, w: 14, h: 10 },
};

export type DiscoveryVisibility = "visible" | "anonymous" | "hidden";

export type Attendee = {
  id: string;
  name: string;
  initials: string;
  university: string;
  interests: string[];
  goals: string[];
  skills: string[];
  track: string;
  personalityTags: string[];
  currentZone: EventZone;
  discoveryVisibility: DiscoveryVisibility;
  sponsorOpen: boolean;
  metAttendeeIds: string[];
  questActivityScore: number; // 0–100
  lookingFor: string[];
};

export const TRACKS = ["AI", "Startup", "Sports Tech", "Design", "Fintech", "Cloud", "Gaming", "Robotics"] as const;

export const ATTENDEE_FILTERS = [
  "basketball", "startups", "AI", "internships", "design", "backend", "frontend",
  "founder energy", "beginner-friendly", "same track", "people I have not met yet",
  "business", "product", "cloud", "fintech", "sports tech", "gaming", "robotics", "consulting",
] as const;
export type AttendeeFilter = (typeof ATTENDEE_FILTERS)[number];

export const SPONSOR_GOALS = [
  "hiring", "internships", "product feedback", "brand awareness", "startup leads", "student ambassadors",
] as const;
export type SponsorGoal = (typeof SPONSOR_GOALS)[number];

export const SPONSOR_TARGET_FILTERS = [
  "AI beginners", "technical builders", "backend devs", "frontend devs", "business students",
  "founders", "designers", "fintech", "sports tech", "cloud", "robotics", "consulting",
  "product people", "pitch people", "students seeking internships",
  "high quest activity", "sponsor-open attendees",
] as const;
export type SponsorTargetFilter = (typeof SPONSOR_TARGET_FILTERS)[number];

// --- helpers to build the seed ---
const initials = (name: string) =>
  name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

const universities = [
  "TUM", "LMU", "ETH Zürich", "EPFL", "HSG St. Gallen", "TU Berlin",
  "RWTH Aachen", "KIT", "Oxford", "Imperial", "Bocconi", "INSEAD",
];

// 32 seeded attendees
const seed: Omit<Attendee, "initials">[] = [
  { id: "a01", name: "Mira Schultz",   university: "TUM",          interests: ["basketball","startups","sports tech"], goals: ["find cofounder","make friends"],         skills: ["frontend","pitching"],         track: "Startup",     personalityTags: ["extrovert","connector","competitive"], currentZone: "Middle Left",    discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: ["a05"],         questActivityScore: 78, lookingFor: ["cofounder","sports tech people"] },
  { id: "a02", name: "Jonas Albrecht", university: "ETH Zürich",   interests: ["AI","robotics","cloud"],               goals: ["learn AI","build something impressive"], skills: ["AI engineering","backend"],    track: "AI",          personalityTags: ["serious builder","technical"],         currentZone: "Front Left",     discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: [],              questActivityScore: 92, lookingFor: ["AI mentors"] },
  { id: "a03", name: "Aisha Khan",     university: "Imperial",     interests: ["design","AI","education"],             goals: ["create content","make friends"],         skills: ["design","frontend"],           track: "Design",      personalityTags: ["creative","beginner-friendly"],        currentZone: "Coffee Area",    discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: ["a10"],         questActivityScore: 55, lookingFor: ["designers"] },
  { id: "a04", name: "Pavel Novak",    university: "TU Berlin",    interests: ["fintech","startups","AI"],             goals: ["talk to sponsors","internship"],         skills: ["backend","business"],          track: "Fintech",     personalityTags: ["strategic","curious"],                 currentZone: "Sponsor Booths", discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: [],              questActivityScore: 84, lookingFor: ["sponsors","internship"] },
  { id: "a05", name: "Leah Berger",    university: "LMU",          interests: ["basketball","music","sustainability"], goals: ["make friends","just survive socially"],  skills: ["marketing","public speaking"], track: "Startup",     personalityTags: ["extrovert","chill"],                   currentZone: "Middle Left",    discoveryVisibility: "visible",   sponsorOpen: false, metAttendeeIds: ["a01"],         questActivityScore: 40, lookingFor: ["friends"] },
  { id: "a06", name: "Daniel Park",    university: "KIT",          interests: ["gaming","AI","robotics"],              goals: ["build something impressive","win"],      skills: ["AI engineering","cloud"],      track: "Gaming",      personalityTags: ["technical","competitive"],             currentZone: "Back Area",      discoveryVisibility: "anonymous", sponsorOpen: false, metAttendeeIds: [],              questActivityScore: 88, lookingFor: ["teammates"] },
  { id: "a07", name: "Sofia Rossi",    university: "Bocconi",      interests: ["consulting","fintech","business"],     goals: ["internship","talk to sponsors"],         skills: ["business","pitching"],         track: "Fintech",     personalityTags: ["strategic","serious builder"],         currentZone: "Sponsor Booths", discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: [],              questActivityScore: 70, lookingFor: ["consulting roles"] },
  { id: "a08", name: "Marcus Bauer",   university: "RWTH Aachen",  interests: ["robotics","AI","sports tech"],         goals: ["find cofounder","learn AI"],             skills: ["backend","AI engineering"],    track: "Robotics",    personalityTags: ["technical","curious"],                 currentZone: "Front Right",    discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: [],              questActivityScore: 81, lookingFor: ["cofounder"] },
  { id: "a09", name: "Naomi Becker",   university: "HSG St. Gallen", interests: ["business","startups","consulting"],  goals: ["internship","make friends"],             skills: ["business","marketing"],        track: "Startup",     personalityTags: ["connector","extrovert"],               currentZone: "Coffee Area",    discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: [],              questActivityScore: 66, lookingFor: ["business people","sponsors"] },
  { id: "a10", name: "Yuki Tanaka",    university: "EPFL",         interests: ["design","gaming","AI"],                goals: ["create content","build something impressive"], skills: ["design","frontend"],     track: "Design",      personalityTags: ["creative","introvert"],                currentZone: "Coffee Area",    discoveryVisibility: "anonymous", sponsorOpen: false, metAttendeeIds: ["a03"],         questActivityScore: 49, lookingFor: ["design friends"] },
  { id: "a11", name: "Carlos Mendez",  university: "INSEAD",       interests: ["fintech","startups","AI"],             goals: ["find cofounder","talk to sponsors"],     skills: ["business","product"],          track: "Fintech",     personalityTags: ["strategic","connector"],               currentZone: "Sponsor Booths", discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: [],              questActivityScore: 75, lookingFor: ["cofounder","investors"] },
  { id: "a12", name: "Hannah Voigt",   university: "TUM",          interests: ["AI","cloud","data science"],           goals: ["learn AI","internship"],                 skills: ["AI engineering","data science"], track: "AI",        personalityTags: ["technical","beginner-friendly"],       currentZone: "Front Left",     discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: [],              questActivityScore: 90, lookingFor: ["AI mentors","internship"] },
  { id: "a13", name: "Idris Lawal",    university: "Oxford",       interests: ["startups","AI","education"],           goals: ["find cofounder","build something impressive"], skills: ["product","backend"],     track: "Startup",     personalityTags: ["serious builder","curious"],           currentZone: "Middle Right",   discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: [],              questActivityScore: 87, lookingFor: ["cofounder"] },
  { id: "a14", name: "Elena Petrova",  university: "ETH Zürich",   interests: ["sports tech","basketball","AI"],       goals: ["find cofounder","talk to sponsors"],     skills: ["AI engineering","pitching"],   track: "Sports Tech", personalityTags: ["creative","competitive"],              currentZone: "Middle Left",    discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: [],              questActivityScore: 82, lookingFor: ["sports tech people"] },
  { id: "a15", name: "Tom Fischer",    university: "TU Berlin",    interests: ["gaming","cloud","AI"],                 goals: ["win","make friends"],                    skills: ["backend","cloud"],             track: "Gaming",      personalityTags: ["chill","technical"],                   currentZone: "Back Area",      discoveryVisibility: "visible",   sponsorOpen: false, metAttendeeIds: [],              questActivityScore: 60, lookingFor: ["gaming friends"] },
  { id: "a16", name: "Priya Shah",     university: "Imperial",     interests: ["AI","design","education"],             goals: ["learn AI","make friends"],               skills: ["design","data science"],       track: "AI",          personalityTags: ["beginner-friendly","creative"],        currentZone: "Front Right",    discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: [],              questActivityScore: 58, lookingFor: ["AI study buddies"] },
  { id: "a17", name: "Greta Sommer",   university: "LMU",          interests: ["sustainability","startups","design"],  goals: ["find cofounder","create content"],       skills: ["design","marketing"],          track: "Design",      personalityTags: ["creative","connector"],                currentZone: "Middle Right",   discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: [],              questActivityScore: 73, lookingFor: ["impact founders"] },
  { id: "a18", name: "Omar Haddad",    university: "KIT",          interests: ["robotics","AI","cloud"],               goals: ["build something impressive","learn AI"], skills: ["AI engineering","backend"],    track: "Robotics",    personalityTags: ["technical","serious builder"],         currentZone: "Front Left",     discoveryVisibility: "visible",   sponsorOpen: false, metAttendeeIds: [],              questActivityScore: 80, lookingFor: ["robotics builders"] },
  { id: "a19", name: "Beatrice Lang",  university: "HSG St. Gallen", interests: ["consulting","business","fintech"],   goals: ["internship","talk to sponsors"],         skills: ["business","public speaking"],  track: "Fintech",     personalityTags: ["strategic","extrovert"],               currentZone: "Sponsor Booths", discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: [],              questActivityScore: 68, lookingFor: ["consulting people"] },
  { id: "a20", name: "Felix Krüger",   university: "RWTH Aachen",  interests: ["AI","sports tech","basketball"],       goals: ["learn AI","make friends"],               skills: ["frontend","AI engineering"],   track: "Sports Tech", personalityTags: ["beginner-friendly","curious"],         currentZone: "Middle Left",    discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: [],              questActivityScore: 64, lookingFor: ["AI beginners"] },
  { id: "a21", name: "Sara Lindqvist", university: "EPFL",         interests: ["design","AI","music"],                 goals: ["create content","just survive socially"], skills: ["design","frontend"],          track: "Design",      personalityTags: ["introvert","creative"],                currentZone: "Coffee Area",    discoveryVisibility: "hidden",    sponsorOpen: false, metAttendeeIds: [],              questActivityScore: 30, lookingFor: [] },
  { id: "a22", name: "Lucas Moreau",   university: "INSEAD",       interests: ["startups","fintech","business"],       goals: ["find cofounder","talk to sponsors"],     skills: ["business","product"],          track: "Startup",     personalityTags: ["connector","strategic"],               currentZone: "Sponsor Booths", discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: [],              questActivityScore: 77, lookingFor: ["cofounder"] },
  { id: "a23", name: "Mei Lin",        university: "Oxford",       interests: ["AI","data science","education"],       goals: ["learn AI","internship"],                 skills: ["data science","AI engineering"], track: "AI",        personalityTags: ["technical","beginner-friendly"],       currentZone: "Front Left",     discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: [],              questActivityScore: 86, lookingFor: ["AI mentors"] },
  { id: "a24", name: "Noah Weiss",     university: "TUM",          interests: ["gaming","AI","sports tech"],           goals: ["build something impressive","win"],      skills: ["backend","AI engineering"],    track: "Gaming",      personalityTags: ["competitive","technical"],             currentZone: "Back Area",      discoveryVisibility: "visible",   sponsorOpen: false, metAttendeeIds: [],              questActivityScore: 79, lookingFor: ["teammates"] },
  { id: "a25", name: "Ines Costa",     university: "Bocconi",      interests: ["fintech","consulting","AI"],           goals: ["internship","talk to sponsors"],         skills: ["business","data science"],     track: "Fintech",     personalityTags: ["serious builder","strategic"],         currentZone: "Sponsor Booths", discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: [],              questActivityScore: 71, lookingFor: ["fintech jobs"] },
  { id: "a26", name: "Ravi Iyer",      university: "Imperial",     interests: ["robotics","AI","cloud"],               goals: ["find cofounder","build something impressive"], skills: ["cloud","backend"],       track: "Robotics",    personalityTags: ["technical","curious"],                 currentZone: "Front Right",    discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: [],              questActivityScore: 83, lookingFor: ["robotics cofounder"] },
  { id: "a27", name: "Klara Ostrowska",university: "TU Berlin",    interests: ["design","startups","sustainability"],  goals: ["find cofounder","create content"],       skills: ["design","marketing"],          track: "Design",      personalityTags: ["creative","connector"],                currentZone: "Middle Right",   discoveryVisibility: "anonymous", sponsorOpen: false, metAttendeeIds: [],              questActivityScore: 52, lookingFor: ["design cofounder"] },
  { id: "a28", name: "Henry Walsh",    university: "Oxford",       interests: ["business","consulting","startups"],    goals: ["internship","make friends"],             skills: ["business","public speaking"],  track: "Startup",     personalityTags: ["extrovert","strategic"],               currentZone: "Coffee Area",    discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: [],              questActivityScore: 67, lookingFor: ["mentors"] },
  { id: "a29", name: "Zara Ahmed",     university: "ETH Zürich",   interests: ["AI","cloud","sports tech"],            goals: ["learn AI","get product feedback"],       skills: ["cloud","AI engineering"],      track: "AI",          personalityTags: ["technical","serious builder"],         currentZone: "Front Left",     discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: [],              questActivityScore: 89, lookingFor: ["AI feedback"] },
  { id: "a30", name: "Vincent Roux",   university: "EPFL",         interests: ["gaming","design","AI"],                goals: ["create content","win"],                  skills: ["design","frontend"],           track: "Gaming",      personalityTags: ["creative","competitive"],              currentZone: "Back Area",      discoveryVisibility: "visible",   sponsorOpen: false, metAttendeeIds: [],              questActivityScore: 62, lookingFor: ["game devs"] },
  { id: "a31", name: "Lara Hoffmann",  university: "TUM",          interests: ["sports tech","basketball","startups"], goals: ["find cofounder","talk to sponsors"],     skills: ["product","pitching"],          track: "Sports Tech", personalityTags: ["competitive","connector"],             currentZone: "Middle Left",    discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: [],              questActivityScore: 85, lookingFor: ["sports tech cofounder"] },
  { id: "a32", name: "Theo Brandt",    university: "KIT",          interests: ["AI","robotics","education"],           goals: ["learn AI","make friends"],               skills: ["AI engineering","data science"], track: "AI",        personalityTags: ["beginner-friendly","curious"],         currentZone: "Stage Area",     discoveryVisibility: "visible",   sponsorOpen: true,  metAttendeeIds: [],              questActivityScore: 74, lookingFor: ["AI beginners"] },
];

export const MOCK_ATTENDEES: Attendee[] = seed.map((a) => ({ ...a, initials: initials(a.name) }));

// Synthetic "current user" used by attendee Vibe Map demo.
export const CURRENT_USER: Attendee = {
  id: "me",
  name: "You",
  initials: "ME",
  university: "TUM",
  interests: ["basketball", "startups", "AI"],
  goals: ["find cofounder", "make friends", "talk to sponsors"],
  skills: ["backend", "product"],
  track: "Startup",
  personalityTags: ["curious", "connector"],
  currentZone: "Middle Left",
  discoveryVisibility: "visible",
  sponsorOpen: true,
  metAttendeeIds: ["a05"],
  questActivityScore: 70,
  lookingFor: ["cofounder", "AI builders"],
};
