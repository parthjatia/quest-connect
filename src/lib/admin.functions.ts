import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const clearAllDataFn = createServerFn({ method: "POST" }).handler(async () => {
  console.log("[clearAllDataFn] starting full reset");

  // Run the database-side reset as a single privileged operation.
  const { error: resetErr } = await supabaseAdmin.rpc("admin_clear_attendees_and_pods");
  if (resetErr) {
    console.error("[clearAllDataFn] reset RPC failed:", resetErr);
    throw new Error(`Failed to clear attendees and pods: ${resetErr.message}`);
  }

  // Verify every live/event activity table is back to zero.
  const tables = [
    "pod_verifications",
    "attendee_meets",
    "completed_quests",
    "group_quest_submissions",
    "quest_transcripts",
    "attendees",
    "groups",
  ] as const;

  const remaining: Record<string, number> = {};
  for (const t of tables) {
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

export const deleteQuestFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    if (!data?.id) throw new Error("Quest id is required");
    return data;
  })
  .handler(async ({ data }) => {
    console.log("[deleteQuestFn] deleting quest", data.id);

    const relatedTables = ["completed_quests", "group_quest_submissions", "quest_transcripts"] as const;
    const deleted: Record<string, number> = {};

    for (const table of relatedTables) {
      const { count, error } = await supabaseAdmin
        .from(table)
        .delete({ count: "exact" })
        .eq("quest_id", data.id);
      if (error) throw new Error(`Failed to clear ${table}: ${error.message}`);
      deleted[table] = count ?? 0;
    }

    const { count, error } = await supabaseAdmin
      .from("quests")
      .delete({ count: "exact" })
      .eq("id", data.id);
    if (error) throw new Error(`Failed to delete quest: ${error.message}`);
    if ((count ?? 0) === 0) throw new Error("Quest was not found or already deleted");

    return { ok: true as const, deleted: { ...deleted, quests: count ?? 0 } };
  });
