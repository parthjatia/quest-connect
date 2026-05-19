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
    const { data: attendee, error: aErr } = await supabaseAdmin
      .from("attendees").select("*").eq("user_id", context.userId).single();
    if (aErr || !attendee) throw new Error("Attendee not found");

    if (attendee.wrapped_story && attendee.wrapped_image_url) {
      return { story: attendee.wrapped_story, image_url: attendee.wrapped_image_url, points: attendee.points, cached: true };
    }

    const { data: completed } = await supabaseAdmin
      .from("completed_quests")
      .select("quest_photo_url, quests(title, description, type)")
      .eq("attendee_id", attendee.id);

    const rows = completed ?? [];
    const questList = rows
      .map((c) => {
        const q = c.quests as { title: string; type: string } | null;
        return q ? `- ${q.title} (${q.type})` : null;
      })
      .filter(Boolean).join("\n");

    const profileSummary = `${attendee.full_name}, ${attendee.academic_background} from ${attendee.university}. Track: ${trackLabel(attendee.track_intent)}. Goal: ${goalLabel(attendee.event_goal)}. AI level: ${attendee.ai_experience}.`;

    // 1) Story
    const storyRes = await callGateway("google/gemini-2.5-flash", [
      { role: "system", content: "You write punchy, comic-book narration. 2 short paragraphs. Heroic, energetic, never cheesy." },
      { role: "user", content: `Write a 'Hero's Journey' recap of this attendee's hackathon. Reference their actual quests. Profile: ${profileSummary}\n\nQuests completed (${attendee.points} pts):\n${questList || "(none yet)"}` },
    ]);
    const story: string = storyRes?.choices?.[0]?.message?.content ?? "Your story is still being written.";

    // 2) Image — stylize from a real quest photo if any
    const photoUrls = rows.map((r) => r.quest_photo_url).filter((u): u is string => !!u);
    const referencePhoto = photoUrls[Math.floor(Math.random() * photoUrls.length)];

    let imageUrl = "";
    try {
      const userContent: Array<Record<string, unknown>> = [
        {
          type: "text",
          text: referencePhoto
            ? `Transform the attached event photo into an epic comic-book hero portrait of the person. Bold inked lines, halftone shading, dynamic pose, vibrant indigo + neon mint palette, dark background, single splash panel, NO text. Keep the person's recognizable features.`
            : `Comic-book illustration of a hackathon hero (${attendee.academic_background}, working on ${trackLabel(attendee.track_intent)}). Bold inked lines, halftone shading, dynamic action pose. Vibrant indigo + neon mint palette, dark background. Single splash panel, no text.`,
        },
      ];
      if (referencePhoto) userContent.push({ type: "image_url", image_url: { url: referencePhoto } });

      const imgRes = await callGateway(
        "google/gemini-2.5-flash-image",
        [{ role: "user", content: userContent }],
        ["image", "text"],
      );
      const msg = imgRes?.choices?.[0]?.message;
      const url: string | undefined =
        msg?.images?.[0]?.image_url?.url ??
        (Array.isArray(msg?.content) ? msg.content.find((c: { type: string }) => c.type === "image_url")?.image_url?.url : undefined);
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
