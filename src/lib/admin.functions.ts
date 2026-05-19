import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const clearAllDataFn = createServerFn({ method: "POST" }).handler(async () => {
  console.log("[clearAllDataFn] starting full reset");

  // Hard reset every activity table back to zero. Order matters for FK safety.
  const tables = [
    "pod_verifications",
    "attendee_meets",
    "completed_quests",
    "group_quest_submissions",
    "quest_transcripts",
  ] as const;

  for (const t of tables) {
    const { error } = await supabaseAdmin.from(t).delete().not("id", "is", null);
    if (error) {
      console.error(`[clearAllDataFn] failed clearing ${t}:`, error);
      throw new Error(`Failed to clear ${t}: ${error.message ?? "unknown"}`);
    }
  }

  // Unlink attendees from any pod, then delete attendees and groups.
  const { error: unlinkErr } = await supabaseAdmin
    .from("attendees")
    .update({ group_id: null })
    .not("group_id", "is", null);
  if (unlinkErr) throw new Error(`Failed to unlink attendees: ${unlinkErr.message}`);

  const { error: attErr } = await supabaseAdmin.from("attendees").delete().not("id", "is", null);
  if (attErr) throw new Error(`Failed to delete attendees: ${attErr.message}`);

  const { error: grpErr } = await supabaseAdmin.from("groups").delete().not("id", "is", null);
  if (grpErr) throw new Error(`Failed to delete groups: ${grpErr.message}`);

  // Verify the reset by reading remaining row counts. If anything is left, fail loudly.
  const remaining: Record<string, number> = {};
  for (const t of [...tables, "attendees", "groups"] as const) {
    const { count, error } = await supabaseAdmin
      .from(t)
      .select("id", { count: "exact", head: true });
    if (error) throw new Error(`Failed to verify ${t}: ${error.message}`);
    remaining[t] = count ?? 0;
  }

  const leftover = Object.entries(remaining).filter(([, n]) => n > 0);
  if (leftover.length > 0) {
    const msg = leftover.map(([t, n]) => `${t}=${n}`).join(", ");
    console.error("[clearAllDataFn] reset incomplete:", msg);
    throw new Error(`Reset incomplete — rows remaining: ${msg}`);
  }

  console.log("[clearAllDataFn] done — all counters at 0");
  return { ok: true as const, remaining };
});
