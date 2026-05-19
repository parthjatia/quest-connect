import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { trackLabel, goalLabel } from "@/lib/attendee-options";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callGateway(
  model: string,
  messages: Array<{ role: string; content: unknown }>,
  modalities?: string[],
) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
  const body: Record<string, unknown> = { model, messages };
  if (modalities) body.modalities = modalities;
  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 429) throw new Error("AI rate limit hit. Try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
    throw new Error(`AI gateway error ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

/** Generate per-quest AI feedback from the uploaded proof photo. */
export const generateQuestFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ completed_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await supabaseAdmin
      .from("completed_quests")
      .select("id, quest_photo_url, attendee_id, quests(title, description, type), attendees(user_id, full_name)")
      .eq("id", data.completed_id)
      .single();
    if (error || !row) throw new Error("Completion not found");
    const attendee = row.attendees as { user_id: string; full_name: string } | null;
    if (!attendee || attendee.user_id !== context.userId) throw new Error("Forbidden");
    const quest = row.quests as { title: string; description: string; type: string } | null;
    if (!quest) throw new Error("Quest missing");

    const res = await callGateway("google/gemini-2.5-flash", [
      {
        role: "system",
        content:
          "You are an energetic event hype-coach. Write ONE short paragraph (max 50 words) reacting to the attendee's proof photo for a quest. Be specific about what you see, encouraging, comic-book energetic. No emojis unless one feels essential.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Quest: ${quest.title} — ${quest.description}\nAttendee: ${attendee.full_name}` },
          { type: "image_url", image_url: { url: row.quest_photo_url! } },
        ],
      },
    ]);
    const feedback: string = res?.choices?.[0]?.message?.content ?? "Legendary move. Onto the next quest.";
    await supabaseAdmin.from("completed_quests").update({ ai_feedback: feedback }).eq("id", row.id);
    return { feedback };
  });

/** Generate icebreaker suggestions from the attendee profile (called after onboarding). */
export const generateIcebreakers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: a, error } = await supabaseAdmin
      .from("attendees").select("*").eq("user_id", context.userId).single();
    if (error || !a) throw new Error("Attendee not found");
    const profile = `${a.full_name}, ${a.academic_background} from ${a.university}. Track: ${trackLabel(a.track_intent)}. Goal: ${goalLabel(a.event_goal)}. AI level: ${a.ai_experience}.`;
    const res = await callGateway("google/gemini-2.5-flash", [
      { role: "system", content: "Generate 3 punchy icebreaker openers (one sentence each) that this attendee can say to strangers at a hackathon. Return as a numbered list, no preamble." },
      { role: "user", content: profile },
    ]);
    const text: string = res?.choices?.[0]?.message?.content ?? "";
    await supabaseAdmin.from("attendees").update({ icebreakers: text }).eq("id", a.id);
    return { icebreakers: text };
  });

/** Admin: AI-written summary of the event so far. */
export const generateAdminSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!isAdmin) throw new Error("Forbidden: admin only");

    const [{ data: top }, { count: total }, { count: claims }, { count: groups }] = await Promise.all([
      supabaseAdmin.from("attendees").select("full_name, university, points").order("points", { ascending: false }).limit(5),
      supabaseAdmin.from("attendees").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("completed_quests").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("groups").select("id", { count: "exact", head: true }),
    ]);

    const lb = (top ?? []).map((a, i) => `${i + 1}. ${a.full_name} (${a.university}) — ${a.points} pts`).join("\n");
    const res = await callGateway("google/gemini-2.5-flash", [
      { role: "system", content: "You are an event MC. Write a punchy 3-sentence summary for organizers about how the event is going. Reference real numbers." },
      { role: "user", content: `Attendees: ${total ?? 0}. Pods formed: ${groups ?? 0}. Total quest claims: ${claims ?? 0}.\nTop 5:\n${lb}` },
    ]);
    return { summary: res?.choices?.[0]?.message?.content ?? "" };
  });
