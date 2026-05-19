import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const clearAllDataFn = createServerFn({ method: "POST" }).handler(async () => {
  const tables = [
    "pod_verifications",
    "attendee_meets",
    "completed_quests",
    "group_quest_submissions",
    "quest_transcripts",
    "attendees",
    "groups",
    "quests",
  ] as const;
  for (const t of tables) {
    const { error } = await supabaseAdmin.from(t).delete().not("id", "is", null);
    if (error) throw new Error(`Failed to clear ${t}: ${error.message}`);
  }
  return { ok: true };
});
