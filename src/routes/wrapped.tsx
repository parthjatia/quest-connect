import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getLocalAttendee } from "@/lib/local-attendee";
import { generateWrappedInsight } from "@/lib/wrapped.functions";
import { X, Loader2 } from "lucide-react";
import { FloatingDecor } from "@/components/floating-decor";
import { AnimatedHeadline } from "@/components/animated-text";

export const Route = createFileRoute("/wrapped")({
  head: () => ({ meta: [{ title: "Your Event Wrapped" }] }),
  component: WrappedPage,
});

type SlideData = {
  name: string;
  points: number;
  questXp: number;
  podBonus: number;
  meetBonus: number;
  rank: number;
  totalAttendees: number;
  connectionCount: number;
  topConnections: string[];
  topQuest: { title: string; emoji: string | null; points: number } | null;
  insight: string;
};

const GRADIENTS = [
  "radial-gradient(circle at 20% 110%, #ff2d87 0%, #6b1aff 45%, #0a0a0a 75%)",
  "radial-gradient(ellipse at 70% 10%, #b6ff3d 0%, #00b48a 40%, #0a0a0a 80%)",
  "conic-gradient(from 180deg at 50% 100%, #ff6a3d, #ffb547, #ff2d87, #ff6a3d)",
  "radial-gradient(circle at 80% 80%, #6ee7ff 0%, #7c3aed 45%, #0a0a0a 80%)",
  "radial-gradient(ellipse at 30% 30%, #ff5b8a 0%, #ff8a3d 50%, #0a0a0a 85%)",
  "radial-gradient(circle at 50% 20%, #38bdf8 0%, #10b981 50%, #0a0a0a 85%)",
  "radial-gradient(ellipse at center, #facc15 0%, #ef4444 50%, #0a0a0a 85%)",
];

function WrappedPage() {
  const navigate = useNavigate();
  const [attendee, setAttendee] = useState<{ id: string; name: string } | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const a = getLocalAttendee();
    if (!a) { navigate({ to: "/auth" }); return; }
    setAttendee(a);
  }, [navigate]);

  const q = useQuery<SlideData>({
    queryKey: ["wrapped", attendee?.id],
    enabled: !!attendee,
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const id = attendee!.id;
      const [meRes, meetsRes, completedRes, rankRes] = await Promise.all([
        supabase.from("attendees").select("full_name, points, pod_bonus_points, meet_bonus_points").eq("id", id).maybeSingle(),
        supabase.from("attendee_meets").select("met_attendee_id").eq("attendee_id", id),
        supabase
          .from("completed_quests")
          .select("quest_id, verification_status, quests(title, emoji, points_awarded)")
          .eq("attendee_id", id)
          .in("verification_status", ["approved", "auto"]),
        supabase.from("attendees").select("id, points"),
      ]);

      const me = meRes.data;
      if (!me) throw new Error("Profile missing");

      const metIds = (meetsRes.data ?? []).map((r) => r.met_attendee_id);
      let topConnections: string[] = [];
      if (metIds.length > 0) {
        const { data: people } = await supabase.from("attendees").select("id, full_name").in("id", metIds).limit(50);
        topConnections = (people ?? []).map((p) => p.full_name ?? "Someone").slice(0, 3);
      }

      const all = (rankRes.data ?? []) as Array<{ id: string; points: number }>;
      const sorted = [...all].sort((a, b) => b.points - a.points);
      const rank = sorted.findIndex((x) => x.id === id) + 1 || all.length;

      const approvedQuests = (completedRes.data ?? [])
        .map((c) => c.quests as { title: string; emoji: string | null; points_awarded: number } | null)
        .filter((x): x is { title: string; emoji: string | null; points_awarded: number } => !!x);
      const topQuest = approvedQuests.length
        ? approvedQuests.reduce((a, b) => (b.points_awarded > a.points_awarded ? b : a))
        : null;

      const ins = await generateWrappedInsight({ data: { attendee_id: id } });

      return {
        name: me.full_name ?? "Friend",
        points: me.points ?? 0,
        questXp: Math.max(0, (me.points ?? 0) - (me.pod_bonus_points ?? 0) - (me.meet_bonus_points ?? 0)),
        podBonus: me.pod_bonus_points ?? 0,
        meetBonus: me.meet_bonus_points ?? 0,
        rank,
        totalAttendees: all.length,
        connectionCount: metIds.length,
        topConnections,
        topQuest: topQuest ? { title: topQuest.title, emoji: topQuest.emoji, points: topQuest.points_awarded } : null,
        insight: ins.insight,
      };
    },
  });

  const slides = useMemo(() => {
    if (!q.data) return [];
    const d = q.data;
    const arr: Array<{ key: string; kicker: string; headline: string; sub?: string; big?: string }> = [
      { key: "intro", kicker: "Your event", headline: "You showed up.", sub: `Let's look at how it went, ${d.name.split(" ")[0]}.` },
      { key: "xp", kicker: "Total XP", headline: `${d.points}`, big: "xp", sub: d.totalAttendees > 0 ? `Ranked #${d.rank} of ${d.totalAttendees} attendees` : "You're on the board." },
      { key: "breakdown", kicker: "Where it came from", headline: `${d.questXp} · ${d.podBonus} · ${d.meetBonus}`, sub: `Quests · Pod bonus · Meet bonus` },
      { key: "connections", kicker: "People you met", headline: `${d.connectionCount}`, big: d.connectionCount === 1 ? "new connection" : "new connections", sub: d.topConnections.length > 0 ? `${d.topConnections.join(", ")}${d.connectionCount > 3 ? ` and ${d.connectionCount - 3} more` : ""}` : "Codes scanned, names remembered." },
    ];
    if (d.topQuest) {
      arr.push({ key: "topquest", kicker: "Your top quest", headline: `${d.topQuest.emoji ?? "⭐"} ${d.topQuest.title}`, sub: `+${d.topQuest.points} XP — your biggest win` });
    }
    arr.push({ key: "insight", kicker: "The main insight", headline: d.insight, sub: "Powered by AI" });
    arr.push({ key: "outro", kicker: "That's your event", headline: `Thanks for showing up, ${d.name.split(" ")[0]}.`, sub: "Tap to return to your dashboard." });
    return arr;
  }, [q.data]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") navigate({ to: "/play" });
      else if (e.key === "ArrowRight" || e.key === " ") advance();
      else if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
     
  }, [slides.length, idx]);

  const advance = () => {
    if (idx >= slides.length - 1) navigate({ to: "/play" });
    else setIdx((i) => i + 1);
  };

  if (q.isLoading || !q.data) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-3 text-sm">Wrapping your event…</span>
      </div>
    );
  }

  if (q.error) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white gap-4 p-6 text-center">
        <p>Couldn't load your wrapped. {String((q.error as Error).message)}</p>
        <button onClick={() => navigate({ to: "/play" })} className="underline text-sm">Back to dashboard</button>
      </div>
    );
  }

  const slide = slides[idx];
  const grad = GRADIENTS[idx % GRADIENTS.length];

  return (
    <div
      className="fixed inset-0 bg-black text-white overflow-hidden select-none cursor-pointer"
      onClick={advance}
    >
      {/* progress bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex gap-1">
        {slides.map((_, i) => (
          <div key={i} className="h-0.5 flex-1 bg-white/20 overflow-hidden rounded-full">
            <div
              className="h-full bg-white transition-all duration-300"
              style={{ width: i < idx ? "100%" : i === idx ? "100%" : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* brand chip */}
      <div className="absolute top-7 left-4 z-20 text-[10px] uppercase tracking-[0.25em] font-semibold opacity-80">
        Event Wrapped
      </div>

      {/* close */}
      <button
        onClick={(e) => { e.stopPropagation(); navigate({ to: "/play" }); }}
        className="absolute top-6 right-4 z-20 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>

      {/* slide */}
      <div
        key={slide.key}
        className="absolute inset-0 flex flex-col justify-end px-8 pb-24 pt-20 animate-[wrappedIn_500ms_ease-out] hue-drift overflow-hidden"
        style={{ background: grad }}
      >
        <FloatingDecor variant="dense" />
        <div className="relative z-10 max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.3em] font-semibold opacity-90 mb-4">{slide.kicker}</div>
          <h1
            className="font-extrabold leading-[0.95] tracking-tight"
            style={{
              fontSize: slide.key === "insight"
                ? "clamp(1.75rem, 4.5vw, 3rem)"
                : slide.key === "intro" || slide.key === "outro"
                  ? "clamp(2.5rem, 7vw, 5rem)"
                  : "clamp(3rem, 11vw, 8rem)",
              wordBreak: "break-word",
            }}
          >
            <AnimatedHeadline stagger={25}>{slide.headline}</AnimatedHeadline>
          </h1>
          {slide.big && (
            <div className="mt-2 text-2xl sm:text-3xl font-bold opacity-90">{slide.big}</div>
          )}
          {slide.sub && (
            <p className="mt-6 text-sm sm:text-base opacity-85 max-w-xl">{slide.sub}</p>
          )}
        </div>
        <div className="absolute bottom-6 left-0 right-0 text-center text-[10px] uppercase tracking-[0.3em] opacity-50 z-10">
          {idx >= slides.length - 1 ? "Tap to return" : "Tap to continue"}
        </div>
      </div>

      <style>{`
        @keyframes wrappedIn {
          from { opacity: 0; transform: scale(1.03); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
