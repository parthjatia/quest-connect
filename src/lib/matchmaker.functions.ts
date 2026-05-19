import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildClusters,
  diversifyClusterWithAI,
  heuristicSplit,
  type Attendee,
  type Cluster,
} from "@/lib/matchmaker.server";

export const runLlmMatchmaker = createServerFn({ method: "POST" }).handler(
  async (): Promise<{
    pods_created: number;
    method: "ai" | "mixed" | "heuristic";
    clusters: number;
    error?: string;
  }> => {
    const apiKey = process.env.LOVABLE_API_KEY;

    // 1. Clear existing pods
    const { error: clrAttendeesErr } = await supabaseAdmin
      .from("attendees")
      .update({ group_id: null })
      .not("id", "is", null);
    if (clrAttendeesErr) throw new Error(`reset attendees: ${clrAttendeesErr.message}`);
    const { error: clrGroupsErr } = await supabaseAdmin.from("groups").delete().not("id", "is", null);
    if (clrGroupsErr) throw new Error(`reset groups: ${clrGroupsErr.message}`);

    // 2. Pull eligible attendees
    const { data: rows, error } = await supabaseAdmin
      .from("attendees")
      .select("id, full_name, university, academic_background, ai_experience, track_intent, event_goal, hobbies")
      .eq("late", false)
      .is("group_id", null);
    if (error) throw new Error(error.message);
    const attendees = (rows ?? []) as Attendee[];
    console.log(`[matchmaker] eligible attendees: ${attendees.length}`);
    if (attendees.length < 3) {
      return { pods_created: 0, method: "heuristic", clusters: 0, error: `Only ${attendees.length} eligible attendees (need ≥3)` };
    }

    // 3. Cluster (deterministic)
    const clusters = buildClusters(attendees);
    console.log(`[matchmaker] clusters: ${clusters.length}`);
    if (clusters.length === 0) {
      // Fallback: one open cluster of everyone
      clusters.push({ label: "Open", members: attendees, matchType: "open" } as Cluster);
    }

    // 4. Per-cluster diversity pass
    let method: "ai" | "mixed" | "heuristic" = apiKey ? "ai" : "heuristic";
    let lastError: string | undefined;
    let anyAI = false;
    let anyHeuristic = false;

    type PendingPod = { ids: string[]; cluster: Cluster; rationale?: string };
    const pending: PendingPod[] = [];

    for (const cluster of clusters) {
      let podsForCluster: string[][] = [];
      let rationales: Map<string, string> = new Map();
      if (apiKey) {
        try {
          const r = await diversifyClusterWithAI(cluster, apiKey);
          podsForCluster = r.pods;
          rationales = r.rationales;
          anyAI = true;
        } catch (e) {
          lastError = e instanceof Error ? e.message : String(e);
          console.error(`[matchmaker] AI diversify failed for "${cluster.label}":`, lastError);
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

    if (anyAI && anyHeuristic) method = "mixed";
    else if (anyHeuristic && !anyAI) method = "heuristic";
    else if (anyAI) method = "ai";

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
      if (gErr) throw new Error(`insert group: ${gErr.message}`);
      const { error: aErr } = await supabaseAdmin
        .from("attendees")
        .update({ group_id: g.id })
        .in("id", pod.ids);
      if (aErr) throw new Error(`assign attendees: ${aErr.message}`);
    }

    if (!apiKey) lastError = "LOVABLE_API_KEY missing";
    console.log(`[matchmaker] created ${pending.length} pods (method=${method})`);

    return {
      pods_created: pending.length,
      method,
      clusters: clusters.length,
      error: lastError,
    };
  },
);
