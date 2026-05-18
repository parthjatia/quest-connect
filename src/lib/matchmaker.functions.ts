import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

type Attendee = {
  id: string;
  full_name: string | null;
  university: string | null;
  academic_background: string | null;
  ai_experience: string | null;
  track_intent: string | null;
  event_goal: string | null;
};

/**
 * Heuristic fallback. Groups by event_goal, then balances into pods of 3-5.
 */
function heuristicPods(attendees: Attendee[]): string[][] {
  const byGoal = new Map<string, Attendee[]>();
  for (const a of attendees) {
    const key = a.event_goal || "Open";
    if (!byGoal.has(key)) byGoal.set(key, []);
    byGoal.get(key)!.push(a);
  }
  const pods: string[][] = [];
  for (const [, group] of byGoal) {
    const shuffled = [...group].sort(() => Math.random() - 0.5);
    const ids = shuffled.map((a) => a.id);
    pods.push(...splitToPods(ids));
  }
  return rebalance(pods);
}

/** Split a flat list of ids into pods of 3-5, preferring size 4. */
function splitToPods(ids: string[]): string[][] {
  const n = ids.length;
  if (n === 0) return [];
  if (n < 3) return [ids]; // caller will merge
  const result: string[][] = [];
  // Greedy: try size 4 then 5 then 3
  let i = 0;
  while (i < n) {
    const remaining = n - i;
    let take: number;
    if (remaining <= 5) { take = remaining; }
    else if (remaining === 6) { take = 3; } // 3+3
    else if (remaining === 7) { take = 4; } // 4+3
    else { take = 4; }
    result.push(ids.slice(i, i + take));
    i += take;
  }
  return result;
}

/** Enforce 3 <= size <= 5 by merging undersized pods and splitting oversized ones. */
function rebalance(pods: string[][]): string[][] {
  // Split anything >5
  const stage1: string[][] = [];
  for (const p of pods) {
    if (p.length <= 5) stage1.push(p);
    else stage1.push(...splitToPods(p));
  }
  // Merge anything <3 with the smallest other pod
  const out = stage1.filter((p) => p.length > 0).sort((a, b) => a.length - b.length);
  while (out.length > 1 && out[0].length < 3) {
    const small = out.shift()!;
    // Add to the next smallest pod that can still absorb without going past 5; else create temp oversize then re-split
    const target = out[0];
    target.push(...small);
    if (target.length > 5) {
      out.shift();
      out.push(...splitToPods(target));
    }
    out.sort((a, b) => a.length - b.length);
  }
  // Final pass: split any pod that grew past 5
  const final: string[][] = [];
  for (const p of out) {
    if (p.length <= 5) final.push(p);
    else final.push(...splitToPods(p));
  }
  return final.filter((p) => p.length >= 3);
}

export const runLlmMatchmaker = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ pods_created: number; method: "ai" | "heuristic"; error?: string }> => {
    // 1. Clear existing pods
    await supabaseAdmin.from("attendees").update({ group_id: null }).not("id", "is", null);
    await supabaseAdmin.from("groups").delete().not("id", "is", null);

    // 2. Pull eligible attendees
    const { data: rows, error } = await supabaseAdmin
      .from("attendees")
      .select("id, full_name, university, academic_background, ai_experience, track_intent, event_goal")
      .eq("late", false)
      .is("group_id", null);
    if (error) throw new Error(error.message);
    const attendees = (rows ?? []) as Attendee[];
    if (attendees.length < 3) return { pods_created: 0, method: "heuristic" };

    // 3. Try LLM
    let pods: string[][] = [];
    let method: "ai" | "heuristic" = "ai";
    let llmError: string | undefined;
    const apiKey = process.env.LOVABLE_API_KEY;

    if (apiKey) {
      try {
        const compact = attendees.map((a) => ({
          id: a.id,
          name: a.full_name,
          uni: a.university,
          bg: a.academic_background,
          ai: a.ai_experience,
          track: a.track_intent,
          goal: a.event_goal,
        }));
        const res = await fetch(GATEWAY, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content:
                  "You are a hackathon matchmaker. Form pods of 3-5 attendees. HARD RULE: every member of a pod MUST share the SAME `goal` value. Within each pod MAXIMIZE diversity across university, bg (academic background), ai (ai_experience), and track. Use every attendee id exactly once. Respond ONLY with strict JSON: {\"pods\":[{\"member_ids\":[\"...\"]}, ...]}",
              },
              { role: "user", content: JSON.stringify(compact) },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (res.status === 429) throw new Error("Rate limited (429). Try again in a minute.");
        if (res.status === 402) throw new Error("AI credits exhausted (402). Add credits in workspace settings.");
        if (!res.ok) throw new Error(`Gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
        const j = await res.json();
        const raw: string = j?.choices?.[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(raw);
        const validIds = new Set(attendees.map((a) => a.id));
        const seen = new Set<string>();
        const out: string[][] = [];
        for (const p of parsed.pods ?? []) {
          const clean = (p.member_ids ?? []).filter(
            (id: unknown) => typeof id === "string" && validIds.has(id) && !seen.has(id),
          );
          clean.forEach((id: string) => seen.add(id));
          if (clean.length > 0) out.push(clean);
        }
        // Append any forgotten ids to last pod
        const missing = attendees.map((a) => a.id).filter((id) => !seen.has(id));
        if (missing.length && out.length) out[out.length - 1].push(...missing);
        if (out.length === 0) throw new Error("LLM returned no pods");
        pods = out;
      } catch (e) {
        llmError = e instanceof Error ? e.message : String(e);
        console.error("LLM matchmaker failed, falling back:", llmError);
        method = "heuristic";
        pods = heuristicPods(attendees);
      }
    } else {
      method = "heuristic";
      pods = heuristicPods(attendees);
      llmError = "LOVABLE_API_KEY missing";
    }

    // 4. Write groups + attendee assignments
    for (const memberIds of pods) {
      const { data: g, error: gErr } = await supabaseAdmin
        .from("groups")
        .insert({ group_name: "Unnamed pod" })
        .select("id")
        .single();
      if (gErr) throw new Error(gErr.message);
      const { error: aErr } = await supabaseAdmin
        .from("attendees")
        .update({ group_id: g.id })
        .in("id", memberIds);
      if (aErr) throw new Error(aErr.message);
    }

    return { pods_created: pods.length, method, error: llmError };
  },
);
