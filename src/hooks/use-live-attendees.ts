import { useQuery } from "@tanstack/react-query";
import { fetchLiveAttendees, type LiveAttendeeResult } from "@/lib/attendeeDataAdapter";

export function useLiveAttendees() {
  return useQuery<LiveAttendeeResult>({
    queryKey: ["live-attendees"],
    queryFn: fetchLiveAttendees,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
