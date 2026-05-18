import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const POD_SIZE = 5;
const ADJECTIVES = ["Neon", "Cosmic", "Quantum", "Stellar", "Pixel", "Atomic", "Lunar", "Solar", "Cyber", "Plasma", "Vortex", "Echo"];
const NOUNS = ["Foxes", "Otters", "Owls", "Wolves", "Hawks", "Pandas", "Lynxes", "Ravens", "Tigers", "Dragons", "Phoenix", "Falcons"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Diversity-aware grouping: round-robin across track + ai_experience buckets
function buildPods(attendees: Array<{ id: string; track_intent: string | null; ai_experience: string | null }>) {
  const buckets = new Map<string, string[]>();
  for (const a of attendees) {
    const key = `${a.track_intent ?? "?"}::${a.ai_experience ?? "?"}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(a.id);
  }
  // Shuffle each bucket
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
  // Merge a trailing tiny pod (<3) into previous
  if (pods.length > 1 && pods[pods.length - 1].length < 3) {
    const tail = pods.pop()!;
    pods[pods.length - 1].push(...tail);
  }
  return pods;
}

export const runMatchmaker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Admin gate
    const { data: roleRow } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!roleRow) throw new Error("Forbidden: admin only");

    const { data: unassigned, error: uErr } = await supabaseAdmin
      .from("attendees")
      .select("id, track_intent, ai_experience")
      .is("group_id", null)
      .eq("onboarded", true);
    if (uErr) throw new Error(uErr.message);
    if (!unassigned || unassigned.length === 0) {
      return { pods_created: 0, attendees_assigned: 0 };
    }

    const pods = buildPods(unassigned);
    let assigned = 0;
    for (const podIds of pods) {
      const name = `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]}`;
      const { data: group, error: gErr } = await supabaseAdmin.from("groups").insert({ group_name: name }).select("id").single();
      if (gErr) throw new Error(gErr.message);
      const { error: aErr } = await supabaseAdmin.from("attendees").update({ group_id: group.id }).in("id", podIds);
      if (aErr) throw new Error(aErr.message);
      assigned += podIds.length;
    }
    return { pods_created: pods.length, attendees_assigned: assigned };
  });

export const grantAdminToSelf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Bootstrap helper: anyone can claim the FIRST admin role. After that, locked.
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) {
      // Only existing admins can promote
      const { data: me } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
      if (!me) throw new Error("Admin role already claimed. Ask an existing admin to promote you.");
    }
    const { error } = await supabaseAdmin
      .from("user_roles").insert({ user_id: context.userId, role: "admin" });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });
