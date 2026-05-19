import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const clearAllDataFn = createServerFn({ method: "POST" }).handler(async () => {
  console.log("[clearAllDataFn] starting");
  const { data, error } = await supabaseAdmin.rpc("admin_clear_attendees_and_pods");
  if (error) {
    console.error("[clearAllDataFn] rpc error:", error);
    throw new Error(`Failed to clear: ${error.message}`);
  }
  const result = (data ?? {}) as { attendees_deleted?: number; pods_deleted?: number };
  console.log("[clearAllDataFn] done", result);
  return {
    ok: true,
    attendeesDeleted: result.attendees_deleted ?? 0,
    podsDeleted: result.pods_deleted ?? 0,
  };
});
