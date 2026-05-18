// Deterministic mock matchmaker. Swap with real LLM call later (Cursor task).
// Inputs: raw attendee rows. Output: pods of 4-5 with a one-line rationale.

export type MatchInput = {
  id: string;
  full_name: string | null;
  university: string | null;
  academic_background: string | null;
  ai_experience: string | null;
  track_intent: string | null;
  event_goal: string | null;
};

export type Pod = {
  name: string;
  rationale: string;
  member_ids: string[];
};

const POD_ADJ = ["Neon", "Quantum", "Atlas", "Vector", "Lumen", "Helix", "Pixel", "Cobalt", "Ember", "Nimbus", "Orbit", "Solace", "Tide", "Volt", "Echo"];
const POD_NOUN = ["Foxes", "Otters", "Hawks", "Wolves", "Mantas", "Ravens", "Lynx", "Bison", "Cranes", "Falcons", "Whales", "Pumas", "Stags", "Owls", "Koi"];

function shuffle<T>(arr: T[], seed = 42): T[] {
  // Mulberry32 for determinism
  let s = seed;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    const j = Math.floor(r * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Strategy: bucket by track_intent (common build interest), then within each
 * bucket round-robin attendees across pods so each pod mixes AI levels and
 * academic backgrounds. Fast, deterministic, explainable.
 */
export function buildPods(attendees: MatchInput[], targetSize = 5): Pod[] {
  if (attendees.length === 0) return [];

  const byTrack = new Map<string, MatchInput[]>();
  for (const a of attendees) {
    const key = a.track_intent || "Open track (no theme)";
    if (!byTrack.has(key)) byTrack.set(key, []);
    byTrack.get(key)!.push(a);
  }

  const pods: Pod[] = [];
  let podIdx = 0;

  for (const [track, group] of byTrack) {
    // Sort within track so AI levels/backgrounds alternate when round-robined
    const sorted = shuffle(group, track.length * 7 + group.length);
    const tier = (x: MatchInput) => {
      const lvl = (x.ai_experience || "").toLowerCase();
      if (lvl.includes("power")) return 0;
      if (lvl.includes("inter")) return 1;
      if (lvl.includes("begin")) return 2;
      return 3;
    };
    sorted.sort((a, b) => tier(a) - tier(b));

    const podCount = Math.max(1, Math.round(sorted.length / targetSize));
    const buckets: MatchInput[][] = Array.from({ length: podCount }, () => []);
    sorted.forEach((a, i) => buckets[i % podCount].push(a));

    for (const members of buckets) {
      if (members.length === 0) continue;
      const adj = POD_ADJ[podIdx % POD_ADJ.length];
      const noun = POD_NOUN[(podIdx + 3) % POD_NOUN.length];
      podIdx++;

      const levels = new Set(members.map((m) => m.ai_experience || "?"));
      const backgrounds = new Set(members.map((m) => m.academic_background || "?"));
      const goals = new Set(members.map((m) => m.event_goal || "?"));
      const rationale =
        `${track} crew, ${members.length} builders. ` +
        `Mixes ${[...backgrounds].slice(0, 3).join(" + ")} ` +
        `across ${[...levels].length} AI tier${levels.size === 1 ? "" : "s"}. ` +
        `Shared goal energy: ${[...goals].slice(0, 2).join(", ")}.`;

      pods.push({
        name: `${adj} ${noun}`,
        rationale,
        member_ids: members.map((m) => m.id),
      });
    }
  }

  // Merge any pod that ended up smaller than 3 into its neighbor
  for (let i = pods.length - 1; i > 0; i--) {
    if (pods[i].member_ids.length < 3) {
      pods[i - 1].member_ids.push(...pods[i].member_ids);
      pods[i - 1].rationale = `${pods[i - 1].rationale} (merged for size)`;
      pods.splice(i, 1);
    }
  }

  return pods;
}
