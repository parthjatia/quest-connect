import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import type { Attendee, AttendeeFilter } from "@/data/mockEventData";
import { suggestVibeMapFilters, type VibeFilterSuggestResult } from "@/lib/vibeMap.functions";
import { suggestFiltersFromProfile } from "@/lib/vibeFilterSuggestions";

export type VibeSuggestionState = {
  profile: ReturnType<typeof suggestFiltersFromProfile>;
  aiResult: VibeFilterSuggestResult | null;
  displayFilters: AttendeeFilter[];
  isAiLoading: boolean;
  aiError: string | null;
  fetchAi: () => Promise<VibeFilterSuggestResult | undefined>;
};

export function useVibeFilterSuggestions(
  attendee: Attendee | null,
  attendeeId: string | null,
): VibeSuggestionState {
  const suggestFn = useServerFn(suggestVibeMapFilters);

  const profile = useMemo(
    () => (attendee ? suggestFiltersFromProfile(attendee) : { filters: [] as AttendeeFilter[], suggestions: [] }),
    [attendee],
  );

  const aiQuery = useQuery({
    queryKey: ["vibe-filter-ai", attendeeId],
    enabled: false,
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!attendeeId) throw new Error("No attendee id");
      return suggestFn({ data: { attendee_id: attendeeId } });
    },
  });

  const aiResult = aiQuery.data ?? null;
  const displayFilters = aiResult?.filters.length ? aiResult.filters : profile.filters;

  return {
    profile,
    aiResult,
    displayFilters,
    isAiLoading: aiQuery.isFetching,
    aiError: aiQuery.error instanceof Error
      ? aiQuery.error.message
      : aiResult?.debug.aiError ?? null,
    fetchAi: async () => {
      const res = await aiQuery.refetch();
      return res.data;
    },
  };
}
