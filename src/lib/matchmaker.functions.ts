import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { trackLabel, goalLabel } from "@/lib/attendee-options";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-5.2";

type Attendee = {
  id: string;
  full_name: string | null;
  university: string | null;
  academic_background: string | null;
  ai_experience: string | null;
  track_intent: string | null;
  event_goal: string | null;
  hobbies: string[] | null;
};

/** Split a flat list of ids into pods of 3-5, preferring size 4. */
function splitToPods(ids: string[]): string[][] {
  const n = ids.length;
  if (n === 0) return [];
  if (n < 3) return [ids];
  const result: string[][] = [];
  let i = 0;
  while (i < n) {
    const remaining = n - i;
    let take: number;
    if (remaining <= 5) take = remaining;
    else if (remaining === 6) take = 3;
    else if (remaining === 7) take = 4;
    else take = 4;
    result.push(ids.slice(i, i + take));
    i += take;
  }
  return result;
}

/** Enforce 3 <= size <= 5 by merging undersized pods and splitting oversized ones. */
function rebalance(pods: string[][]): string[][] {
  const stage1: string[][] = [];
  for (const p of pods) {
    if (p.length <= 5) stage1.push(p);
    else stage1.push(...splitToPods(p));
  }
  const out = stage1.filter((p) => p.length > 0).sort((a, b) => a.length - b.length);
  while (out.length > 1 && out[0].length < 3) {
    const small = out.shift()!;
    const target = out[0];
    target.push(...small);
    if (target.length > 5) {
      out.shift();
      out.push(...splitToPods(target));
    }
    out.sort((a, b) => a.length - b.length);
  }
  const final: string[][] = [];
  for (const p of out) {
    if (p.length <= 5) final.push(p);
    else final.push(...splitToPods(p));
  }
  return final.filter((p) => p.length >= 3);
}

/** Heuristic pod split: random shuffle then split. */
function heuristicSplit(ids: string[]): string[][] {
  const shuffled = [...ids].sort(() => Math.random() - 0.5);
  return rebalance(splitToPods(shuffled));
}

type Cluster = {
  label: string;
  members: Attendee[];
  matchType: "both" | "goal" | "track" | "open";
};

/** Stage 0: build clusters. Strict (track+goal) first; leftovers relaxed to goal-only, then track-only, then Open. */
function buildClusters(attendees: Attendee[]): Cluster[] {
  // Strict: both track and goal must match
  const strictMap = new Map<string, Attendee[]>();
  for (const a of attendees) {
    const k = `${a.track_intent ?? "_"}|${a.event_goal ?? "_"}`;
    if (!strictMap.has(k)) strictMap.set(k, []);
    strictMap.get(k)!.push(a);
  }

  const clusters: Cluster[] = [];
  const leftovers: Attendee[] = [];
  for (const [k, arr] of strictMap) {
    if (arr.length >= 3 && k !== "_|_") {
      const [t, g] = k.split("|");
      clusters.push({
        label: `${trackLabel(t)} · ${goalLabel(g)}`,
        members: arr,
        matchType: "both",
      });
    } else {
      leftovers.push(...arr);
    }
  }

  // Relaxed pass on leftovers: prefer goal-only buckets that reach ≥3
  const byGoal = new Map<string, Attendee[]>();
  for (const a of leftovers) {
    const k = a.event_goal ?? "_";
    if (!byGoal.has(k)) byGoal.set(k, []);
    byGoal.get(k)!.push(a);
  }
  const stillLeft: Attendee[] = [];
  for (const [k, arr] of byGoal) {
    if (arr.length >= 3 && k !== "_") {
      clusters.push({ label: `Goal: ${goalLabel(k)}`, members: arr, matchType: "goal" });
    } else {
      stillLeft.push(...arr);
    }
  }

  // Then track-only
  const byTrack = new Map<string, Attendee[]>();
  for (const a of stillLeft) {
    const k = a.track_intent ?? "_";
    if (!byTrack.has(k)) byTrack.set(k, []);
    byTrack.get(k)!.push(a);
  }
  const orphans: Attendee[] = [];
  for (const [k, arr] of byTrack) {
    if (arr.length >= 3 && k !== "_") {
      clusters.push({ label: `Track: ${trackLabel(k)}`, members: arr, matchType: "track" });
    } else {
      orphans.push(...arr);
    }
  }

  // Anything still loose → Open cluster (if ≥3)
  if (orphans.length >= 3) {
    clusters.push({ label: "Open", members: orphans, matchType: "open" });
  } else if (orphans.length > 0 && clusters.length > 0) {
    // Tack onto the smallest existing cluster
    clusters.sort((a, b) => a.members.length - b.members.length);
    clusters[0].members.push(...orphans);
  }

  return clusters;
}

/** Stage 1: OpenAI diversity pass within a cluster. Returns pods (arrays of attendee ids). */
async function diversifyClusterWithOpenAI(
  cluster: Cluster,
  apiKey: string,
): Promise<{ pods: string[][]; rationales: Map<string, string> }> {
  const compact = cluster.members.map((a) => ({
    id: a.id,
    uni: a.university,
    bg: a.academic_background,
    ai: a.ai_experience,
    hobbies: a.hobbies ?? [],
    track: trackLabel(a.track_intent),
    goal: goalLabel(a.event_goal),
  }));

  const res = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            'You are a hackathon matchmaker. The attendees in this cluster already share track and/or goal alignment. Split them into pods of 3-5 members. MAXIMIZE diversity across `uni` (university), `bg` (academic background), `ai` (ai experience level), and `hobbies` — try to make every pod as different internally as possible on those four axes. Every attendee id MUST appear in exactly one pod. Respond ONLY with strict JSON: {"pods":[{"member_ids":["..."],"rationale":"one short sentence about the mix"}]}',
        },
        {
          role: "user",
          content: `Cluster: ${cluster.label}\nMembers:\n${JSON.stringify(compact)}`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("OpenAI rate limited (429)");
  if (res.status === 402) throw new Error("OpenAI quota exhausted (402)");
  if (res.status === 401) throw new Error("OpenAI auth failed (401) — check OPENAI_API_KEY");
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const j = await res.json();
  const raw: string = j?.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);

  const validIds = new Set(cluster.members.map((a) => a.id));
  const seen = new Set<string>();
  const pods: string[][] = [];
  const rationales = new Map<string, string>();

  for (const p of parsed.pods ?? []) {
    const clean = (p.member_ids ?? []).filter(
      (id: unknown) => typeof id === "string" && validIds.has(id) && !seen.has(id),
    );
    clean.forEach((id: string) => seen.add(id));
    if (clean.length > 0) {
      pods.push(clean);
      if (typeof p.rationale === "string" && p.rationale.trim()) {
        rationales.set(clean.join(","), p.rationale.trim().slice(0, 200));
      }
    }
  }
  // Append any forgotten attendees to the last pod
  const missing = cluster.members.map((a) => a.id).filter((id) => !seen.has(id));
  if (missing.length && pods.length) pods[pods.length - 1].push(...missing);
  else if (missing.length) pods.push(missing);

  const balanced = rebalance(pods);
  return { pods: balanced, rationales };
}

export const runLlmMatchmaker = createServerFn({ method: "POST" }).handler(
  async (): Promise<{
    pods_created: number;
    method: "openai" | "mixed" | "heuristic";
    clusters: number;
    error?: string;
  }> => {
    const apiKey = process.env.OPENAI_API_KEY;

    // 1. Clear existing pods
    await supabaseAdmin.from("attendees").update({ group_id: null }).not("id", "is", null);
    await supabaseAdmin.from("groups").delete().not("id", "is", null);

    // 2. Pull eligible attendees
    const { data: rows, error } = await supabaseAdmin
      .from("attendees")
      .select("id, full_name, university, academic_background, ai_experience, track_intent, event_goal, hobbies")
      .eq("late", false)
      .is("group_id", null);
    if (error) throw new Error(error.message);
    const attendees = (rows ?? []) as Attendee[];
    if (attendees.length < 3) {
      return { pods_created: 0, method: "heuristic", clusters: 0 };
    }

    // 3. Cluster (deterministic)
    const clusters = buildClusters(attendees);
    if (clusters.length === 0) {
      return { pods_created: 0, method: "heuristic", clusters: 0, error: "No viable cluster (need ≥3 attendees with track/goal)" };
    }

    // 4. Per-cluster diversity pass
    let method: "openai" | "mixed" | "heuristic" = apiKey ? "openai" : "heuristic";
    let lastError: string | undefined;
    let anyOpenAI = false;
    let anyHeuristic = false;

    type PendingPod = { ids: string[]; cluster: Cluster; rationale?: string };
    const pending: PendingPod[] = [];

    for (const cluster of clusters) {
      let podsForCluster: string[][] = [];
      let rationales: Map<string, string> = new Map();
      if (apiKey) {
        try {
          const r = await diversifyClusterWithOpenAI(cluster, apiKey);
          podsForCluster = r.pods;
          rationales = r.rationales;
          anyOpenAI = true;
        } catch (e) {
          lastError = e instanceof Error ? e.message : String(e);
          console.error(`OpenAI diversify failed for cluster "${cluster.label}":`, lastError);
          podsForCluster = heuristicSplit(cluster.members.map((a) => a.id));
          anyHeuristic = true;
        }
      } else {
        podsForCluster = heuristicSplit(cluster.members.map((a) => a.id));
        anyHeuristic = true;
      }
      for (const ids of podsForCluster) {
        pending.push({ ids, cluster, rationale: rationales.get(ids.join(",")) });
      }
    }

    if (anyOpenAI && anyHeuristic) method = "mixed";
    else if (anyHeuristic && !anyOpenAI) method = "heuristic";
    else if (anyOpenAI) method = "openai";

    if (pending.length === 0) {
      return { pods_created: 0, method, clusters: clusters.length, error: lastError ?? "No pods formed" };
    }

    // 5. Write groups + assignments
    for (const pod of pending) {
      const name = pod.cluster.label.slice(0, 60);
      const { data: g, error: gErr } = await supabaseAdmin
        .from("groups")
        .insert({
          group_name: name,
          pod_rationale: pod.rationale ?? `${pod.cluster.label} — ${pod.cluster.matchType} match`,
        })
        .select("id")
        .single();
      if (gErr) throw new Error(gErr.message);
      const { error: aErr } = await supabaseAdmin
        .from("attendees")
        .update({ group_id: g.id })
        .in("id", pod.ids);
      if (aErr) throw new Error(aErr.message);
    }

    if (!apiKey) lastError = "OPENAI_API_KEY missing";

    return {
      pods_created: pending.length,
      method,
      clusters: clusters.length,
      error: lastError,
    };
  },
);
