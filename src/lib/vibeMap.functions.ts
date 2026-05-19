import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ATTENDEE_FILTERS, AttendeeFilter } from "@/data/mockEventData";
import { dbRowToAttendee } from "@/lib/attendeeDataAdapter";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  mergeFilterSuggestions,
  parseAiFilterPayload,
  profileSnapshotForAi,
  suggestFiltersFromProfile,
} from "@/lib/vibeFilterSuggestions";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const FILTER_LIST = ATTENDEE_FILTERS.join(", ");

export type VibeFilterSuggestResult = {
  filters: AttendeeFilter[];
  source: "profile" | "profile+ai";
  profileFilters: AttendeeFilter[];
  aiFilters: AttendeeFilter[];
  suggestions: Array<{ filter: AttendeeFilter; reason: string }>;
  debug: {
    aiAttempted: boolean;
    aiOk: boolean;
    aiError: string | null;
    aiRaw: string | null;
  };
};

async function callFilterAi(profileText: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You pick Vibe Map filters for a hackathon attendee. Return ONLY valid JSON:
{"filters":["filter1","filter2"],"note":"one short sentence"}
Allowed filters (exact strings): ${FILTER_LIST}
Pick 3-5 filters max. Prefer filters strongly supported by the profile. Do not invent filters outside the list.`,
        },
        { role: "user", content: profileText },
      ],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 429) throw new Error("AI rate limit — try again shortly");
    if (res.status === 402) throw new Error("AI credits exhausted");
    throw new Error(`AI gateway ${res.status}: ${txt.slice(0, 180)}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("AI returned empty response");
  return content;
}

/**
 * Suggest Vibe Map filters from attendee profile.
 * Always returns deterministic profile mapping; AI merges on top when available.
 */
export const suggestVibeMapFilters = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ attendee_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<VibeFilterSuggestResult> => {
    const { data: row, error } = await supabaseAdmin
      .from("attendees")
      .select(
        "id, user_id, full_name, university, age, country, track, track_intent, event_goal, academic_background, ai_experience, points, interests, goals, skills, personality_tags, current_zone, discovery_visibility, sponsor_open, met_attendee_ids, quest_activity_score, looking_for",
      )
      .eq("id", data.attendee_id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row) throw new Error("Attendee not found");

    const attendee = dbRowToAttendee(row as Parameters<typeof dbRowToAttendee>[0], { enrich: true });
    const profileResult = suggestFiltersFromProfile(attendee);

    let aiFilters: AttendeeFilter[] = [];
    let aiError: string | null = null;
    let aiRaw: string | null = null;
    let aiOk = false;
    let aiAttempted = false;

    try {
      aiAttempted = true;
      aiRaw = await callFilterAi(profileSnapshotForAi(attendee));
      aiFilters = parseAiFilterPayload(aiRaw);
      aiOk = aiFilters.length > 0;
    } catch (e) {
      aiError = e instanceof Error ? e.message : "AI suggestion failed";
    }

    const merged = aiOk
      ? mergeFilterSuggestions(profileResult.filters, aiFilters)
      : profileResult.filters;

    const source = aiOk ? "profile+ai" as const : "profile" as const;

    const reasonByFilter = new Map(
      profileResult.suggestions.map((s) => [s.filter, s.reason]),
    );
    for (const f of aiFilters) {
      if (!reasonByFilter.has(f)) reasonByFilter.set(f, "Suggested by AI from your profile");
    }

    return {
      filters: merged,
      source,
      profileFilters: profileResult.filters,
      aiFilters,
      suggestions: merged.map((filter) => ({
        filter,
        reason: reasonByFilter.get(filter) ?? "Suggested for you",
      })),
      debug: {
        aiAttempted,
        aiOk,
        aiError,
        aiRaw: aiRaw ? aiRaw.slice(0, 500) : null,
      },
    };
  });
