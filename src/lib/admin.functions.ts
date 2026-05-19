import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const clearAllDataFn = createServerFn({ method: "POST" }).handler(async () => {
  const { error: resetPodsError, count: attendeesReset } = await supabaseAdmin
    .from("attendees")
    .update({ group_id: null }, { count: "exact" })
    .not("group_id", "is", null);
  if (resetPodsError) throw new Error(`Failed to reset attendee pods: ${resetPodsError.message}`);

  const dependentTables = [
    "pod_verifications",
    "attendee_meets",
    "completed_quests",
    "group_quest_submissions",
    "quest_transcripts",
  ] as const;

  for (const table of dependentTables) {
    const { error } = await supabaseAdmin.from(table).delete().not("id", "is", null);
    if (error) throw new Error(`Failed to clear ${table}: ${error.message}`);
  }

  const { error: attendeesError, count: attendeesDeleted } = await supabaseAdmin
    .from("attendees")
    .delete({ count: "exact" })
    .not("id", "is", null);
  if (attendeesError) throw new Error(`Failed to clear attendees: ${attendeesError.message}`);

  const { error: groupsError, count: podsDeleted } = await supabaseAdmin
    .from("groups")
    .delete({ count: "exact" })
    .not("id", "is", null);
  if (groupsError) throw new Error(`Failed to clear pods: ${groupsError.message}`);

  return {
    ok: true,
    attendeesDeleted: attendeesDeleted ?? 0,
    attendeesReset: attendeesReset ?? 0,
    podsDeleted: podsDeleted ?? 0,
  };
});
