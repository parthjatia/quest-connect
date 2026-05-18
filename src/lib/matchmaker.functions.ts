import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const POD_SIZE = 5;
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const ADJECTIVES = ["Neon", "Cosmic", "Quantum", "Stellar", "Pixel", "Atomic", "Lunar", "Solar", "Cyber", "Plasma", "Vortex", "Echo"];
const NOUNS = ["Foxes", "Otters", "Owls", "Wolves", "Hawks", "Pandas", "Lynxes", "Ravens", "Tigers", "Dragons", "Phoenix", "Falcons"];

type AttendeeRow = {
  id: string;
  full_name: string | null;
  track_intent: string | null;
  ai_experience: string | null;
  academic_background: string | null;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Heuristic fallback if LLM call fails or returns garbage. */
function heuristicPods(attendees: AttendeeRow[]): string[][] {
  const buckets = new Map<string, string[]>();
  for (const a of attendees) {
    const key = `${a.track_intent ?? "?"}::${a.ai_experience ?? "?"}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(a.id);
  }
  for (const [k, v] of buckets) buckets.set(k, shuffle(v));
  const queues = Array.from(buckets.values());
  const flat: string[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const q of queues) {
      const v = q.shift();
      if (v) { flat.push(v); added = true; }
    }
  }
  const pods: string[][] = [];
  for (let i = 0; i < flat.length; i += POD_SIZE) pods.push(flat.slice(i, i + POD_SIZE));
  if (pods.length > 1 && pods[pods.length - 1].length < 3) {
    const tail = pods.pop()!;
    pods[pods.length - 1].push(...tail);
  }
  return pods;
}

async function llmPods(attendees: AttendeeRow[]): Promise<{ pods: string[][]; rationale: string } | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return null;

  const roster = attendees.map((a) => ({
    id: a.id,
    bg: a.academic_background ?? "?",
    track: a.track_intent ?? "?",
    ai: a.ai_experience ?? "?",
  }));

  const sys = `You are a hackathon matchmaker. Group attendees into diverse pods of ${POD_SIZE} (last pod can be 3-6). Maximize diversity in academic_background AND ai_experience inside each pod, but try to keep track_intent overlapping so teams can build together. Respond ONLY with valid JSON of this exact shape:
{"pods":[["id1","id2",...], ...], "rationale":"one sentence"}
Use every attendee id exactly once. Do not invent ids.`;

  try {
    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: JSON.stringify(roster) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const raw: string = j?.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.pods)) return null;
    const validIds = new Set(attendees.map((a) => a.id));
    const seen = new Set<string>();
    const pods: string[][] = [];
    for (const pod of parsed.pods) {
      if (!Array.isArray(pod)) continue;
      const clean = pod.filter((x: unknown) => typeof x === "string" && validIds.has(x) && !seen.has(x));
      clean.forEach((id: string) => seen.add(id));
      if (clean.length > 0) pods.push(clean);
    }
    // Append any forgotten attendees to last pod
    const missing = attendees.map((a) => a.id).filter((id) => !seen.has(id));
    if (missing.length > 0 && pods.length > 0) pods[pods.length - 1].push(...missing);
    if (pods.length === 0) return null;
    return { pods, rationale: typeof parsed.rationale === "string" ? parsed.rationale : "" };
  } catch (e) {
    console.error("LLM matchmaker failed, falling back:", e);
    return null;
  }
}

export const runMatchmaker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!roleRow) throw new Error("Forbidden: admin only");

    const { data: unassigned, error: uErr } = await supabaseAdmin
      .from("attendees")
      .select("id, full_name, track_intent, ai_experience, academic_background")
      .is("group_id", null)
      .eq("onboarded", true);
    if (uErr) throw new Error(uErr.message);
    if (!unassigned || unassigned.length === 0) {
      return { pods_created: 0, attendees_assigned: 0, rationale: "", method: "none" };
    }

    const llm = await llmPods(unassigned);
    const pods = llm?.pods ?? heuristicPods(unassigned);
    const rationale = llm?.rationale ?? "Diversity-aware round-robin by track + AI experience (fallback).";
    const method = llm ? "ai" : "heuristic";

    let assigned = 0;
    for (const podIds of pods) {
      const name = `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]}`;
      const { data: group, error: gErr } = await supabaseAdmin.from("groups").insert({ group_name: name }).select("id").single();
      if (gErr) throw new Error(gErr.message);
      const { error: aErr } = await supabaseAdmin.from("attendees").update({ group_id: group.id }).in("id", podIds);
      if (aErr) throw new Error(aErr.message);
      assigned += podIds.length;
    }
    return { pods_created: pods.length, attendees_assigned: assigned, rationale, method };
  });

export const grantAdminToSelf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count } = await supabaseAdmin
      .from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) {
      const { data: me } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
      if (!me) throw new Error("Admin role already claimed. Ask an existing admin to promote you.");
    }
    const { error } = await supabaseAdmin
      .from("user_roles").insert({ user_id: context.userId, role: "admin" });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });
