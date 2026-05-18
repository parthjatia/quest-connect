import { supabase } from "@/integrations/supabase/client";

export async function getRegistrationOpen(): Promise<boolean> {
  const { data, error } = await supabase
    .from("event_settings")
    .select("registration_open")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  return data?.registration_open ?? true;
}

export async function setRegistrationOpen(open: boolean) {
  const { error } = await supabase
    .from("event_settings")
    .update({ registration_open: open, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) throw error;
}
