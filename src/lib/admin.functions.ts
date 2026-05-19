import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const clearAllDataFn = createServerFn({ method: "POST" }).handler(async () => {
  console.log("[clearAllDataFn] starting");

  // Order matters: clear dependent rows first, then attendees, then groups.
  const steps: Array<{ name: string; run: () => Promise<{ error: unknown }> }> = [
    { name: "pod_verifications", run: () => supabaseAdmin.from("pod_verifications").delete().not("id", "is", null) },
    { name: "attendee_meets", run: () => supabaseAdmin.from("attendee_meets").delete().not("id", "is", null) },
    { name: "completed_quests", run: () => supabaseAdmin.from("completed_quests").delete().not("id", "is", null) },
    { name: "group_quest_submissions", run: () => supabaseAdmin.from("group_quest_submissions").delete().not("id", "is", null) },
    { name: "quest_transcripts", run: () => supabaseAdmin.from("quest_transcripts").delete().not("id", "is", null) },
  ];

  for (const step of steps) {
    const { error } = await step.run();
    if (error) {
      console.error(`[clearAllDataFn] failed clearing ${step.name}:`, error);
      throw new Error(`Failed to clear ${step.name}: ${(error as { message?: string }).message ?? "unknown"}`);
    }
  }

  // Unlink attendees from groups before deleting attendees/groups
  const { error: unlinkErr } = await supabaseAdmin
    .from("attendees")
    .update({ group_id: null })
    .not("group_id", "is", null);
  if (unlinkErr) {
    console.error("[clearAllDataFn] failed unlinking attendees from groups:", unlinkErr);
    throw new Error(`Failed to unlink attendees: ${unlinkErr.message}`);
  }

  // Count + delete attendees
  const { count: attendeeCountBefore } = await supabaseAdmin
    .from("attendees")
    .select("id", { count: "exact", head: true });
  const { error: attErr } = await supabaseAdmin.from("attendees").delete().not("id", "is", null);
  if (attErr) {
    console.error("[clearAllDataFn] failed deleting attendees:", attErr);
    throw new Error(`Failed to delete attendees: ${attErr.message}`);
  }

  // Count + delete groups (pods)
  const { count: groupCountBefore } = await supabaseAdmin
    .from("groups")
    .select("id", { count: "exact", head: true });
  const { error: grpErr } = await supabaseAdmin.from("groups").delete().not("id", "is", null);
  if (grpErr) {
    console.error("[clearAllDataFn] failed deleting groups:", grpErr);
    throw new Error(`Failed to delete groups: ${grpErr.message}`);
  }

  const result = {
    ok: true as const,
    attendeesDeleted: attendeeCountBefore ?? 0,
    podsDeleted: groupCountBefore ?? 0,
  };
  console.log("[clearAllDataFn] done", result);
  return result;
});
