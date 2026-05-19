import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const generateWrappedInsight = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ attendee_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: a, error } = await supabaseAdmin
      .from("attendees")
      .select("id, full_name, university, track_intent, event_goal, points, pod_bonus_points, meet_bonus_points, wrapped_story")
      .eq("id", data.attendee_id)
      .maybeSingle();
    if (error || !a) throw new Error("Attendee not found");
    if (a.wrapped_story && a.wrapped_story.length > 20) return { insight: a.wrapped_story };

    const [{ count: meetsCount }, { data: completed }] = await Promise.all([
      supabaseAdmin.from("attendee_meets").select("id", { count: "exact", head: true }).eq("attendee_id", a.id),
      supabaseAdmin
        .from("completed_quests")
        .select("quests(title)")
        .eq("attendee_id", a.id)
        .eq("verification_status", "approved"),
    ]);
    const questTitles = (completed ?? [])
      .map((c) => (c.quests as { title: string } | null)?.title)
      .filter(Boolean)
      .join(", ");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { insight: `${a.full_name ?? "You"} showed up, earned ${a.points} XP, and made real connections. That's a win.` };

    const profile = `Name: ${a.full_name}. University: ${a.university}. Track: ${a.track_intent ?? "—"}. Goal: ${a.event_goal ?? "—"}. XP: ${a.points} (pod bonus ${a.pod_bonus_points}, meet bonus ${a.meet_bonus_points}). Connections: ${meetsCount ?? 0}. Approved quests: ${questTitles || "none"}.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a Spotify-Wrapped-style narrator. Write ONE punchy sentence (max 28 words) capturing this attendee's single most defining insight from the event. Second person. No emojis. No quotes." },
          { role: "user", content: profile },
        ],
      }),
    });
    if (!res.ok) return { insight: `You earned ${a.points} XP and made ${meetsCount ?? 0} real connections. That's a hell of an event.` };
    const json = await res.json();
    const insight: string = json?.choices?.[0]?.message?.content?.trim() ?? `You earned ${a.points} XP. That's a win.`;
    await supabaseAdmin.from("attendees").update({ wrapped_story: insight }).eq("id", a.id);
    return { insight };
  });
