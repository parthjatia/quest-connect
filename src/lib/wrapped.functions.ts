import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callGateway(model: string, messages: Array<{ role: string; content: unknown }>, modalities?: string[]) {
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

export const generateEventWrapped = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Load attendee + completed quests
    const { data: attendee, error: aErr } = await supabaseAdmin
      .from("attendees").select("*").eq("user_id", context.userId).single();
    if (aErr || !attendee) throw new Error("Attendee not found");

    // Return cached if exists
    if (attendee.wrapped_story && attendee.wrapped_image_url) {
      return { story: attendee.wrapped_story, image_url: attendee.wrapped_image_url, points: attendee.points, cached: true };
    }

    const { data: completed } = await supabaseAdmin
      .from("completed_quests")
      .select("quest_id, quests(title, description, points_awarded, type)")
      .eq("attendee_id", attendee.id);

    const questList = (completed ?? [])
      .map((c) => {
        const q = c.quests as { title: string; type: string } | null;
        return q ? `- ${q.title} (${q.type})` : null;
      })
      .filter(Boolean)
      .join("\n");

    const profileSummary = `${attendee.full_name}, ${attendee.academic_background} from ${attendee.university}. Track: ${attendee.track_intent}. Goal: ${attendee.event_goal}. AI level: ${attendee.ai_experience}.`;

    // 1) Story
    const storyRes = await callGateway("google/gemini-3-flash-preview", [
      { role: "system", content: "You write punchy, comic-book narration. 2 short paragraphs. Heroic, energetic, never cheesy." },
      { role: "user", content: `Write a 'Hero's Journey' recap of this attendee's hackathon. Reference their actual quests. Profile: ${profileSummary}\n\nQuests completed (${attendee.points} pts):\n${questList || "(none yet)"}` },
    ]);
    const story: string = storyRes?.choices?.[0]?.message?.content ?? "Your story is still being written.";

    // 2) Image
    let imageUrl = "";
    try {
      const imgRes = await callGateway(
        "google/gemini-3.1-flash-image-preview",
        [{ role: "user", content: `Comic-book illustration, bold inked lines, halftone shading, dynamic action pose. Hero is a hackathon attendee (${attendee.academic_background}, working on ${attendee.track_intent}). Vibrant indigo + neon mint palette, dark background. Single splash panel, no text.` }],
        ["image", "text"],
      );
      const parts = imgRes?.choices?.[0]?.message?.images;
      const url: string | undefined = parts?.[0]?.image_url?.url ?? imgRes?.choices?.[0]?.message?.content?.[0]?.image_url?.url;
      if (url) imageUrl = url;
    } catch (e) {
      console.error("Image gen failed:", e);
    }

    await supabaseAdmin.from("attendees").update({
      wrapped_story: story,
      wrapped_image_url: imageUrl,
    }).eq("id", attendee.id);

    return { story, image_url: imageUrl, points: attendee.points, cached: false };
  });
