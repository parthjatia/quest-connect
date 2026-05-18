import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getLocalAttendee, setLocalAttendee } from "@/lib/local-attendee";
import { toast } from "sonner";
import { PartyPopper, Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/join")({
  head: () => ({ meta: [{ title: "Join the Event — EventQuest" }] }),
  component: JoinPage,
});

function JoinPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const existing = getLocalAttendee();
    if (existing) navigate({ to: "/play" });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return toast.error("Name needs at least 2 characters.");
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("attendees")
        .insert({ full_name: trimmed, onboarded: true })
        .select("id")
        .single();
      if (error) throw error;
      setLocalAttendee(data.id, trimmed);
      toast.success(`Welcome, ${trimmed}! Let's quest.`);
      navigate({ to: "/play" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-6">
          <ArrowLeft className="h-4 w-4" /> back
        </Link>
        <Card className="border-white/20 bg-background/95 backdrop-blur shadow-2xl">
          <CardHeader>
            <div className="inline-grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-lg mb-2">
              <PartyPopper className="h-7 w-7 text-white" />
            </div>
            <CardTitle className="text-3xl">Jump in</CardTitle>
            <CardDescription>Just your name. You're in.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">Your name</label>
                <Input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  disabled={submitting}
                  maxLength={60}
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-gradient-hero shadow-glow" size="lg">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PartyPopper className="mr-2 h-4 w-4" />}
                Join the Event
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
