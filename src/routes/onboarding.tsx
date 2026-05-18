import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — EventQuest" }] }),
  component: Onboarding,
});

const schema = z.object({
  full_name: z.string().min(1).max(100),
  age: z.coerce.number().int().min(13).max(120),
  country: z.string().min(1).max(80),
  university: z.string().min(1).max(150),
  academic_background: z.string().min(1).max(150),
  ai_experience: z.enum(["beginner", "intermediate", "power_user"]),
  track_intent: z.string().min(1).max(150),
  event_goal: z.string().min(1).max(150),
});

const TRACKS = ["AI for Business", "Creative / Marketing Tech", "AI for Good", "Developer Tools", "Healthcare AI", "Hardware / Robotics"];
const GOALS = ["A working product", "Job / internship", "New connections", "Just the experience"];
const BACKGROUNDS = ["Engineering/CS", "Business/Management", "Design", "Sciences", "Humanities", "Other"];

function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const raw = Object.fromEntries(fd.entries());
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("attendees")
      .update({ ...parsed.data, onboarded: true })
      .eq("user_id", user.id);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("You're in. Let's quest.");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Card className="bg-gradient-card shadow-card border-border/60">
          <CardHeader>
            <CardTitle className="text-2xl">Create your player profile</CardTitle>
            <CardDescription>30 seconds. We use this to match your squad and tailor quests.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" name="full_name" />
              <Field label="Age" name="age" type="number" min={13} max={120} />
              <Field label="Country" name="country" />
              <Field label="University" name="university" />
              <SelectField label="Academic background" name="academic_background" options={BACKGROUNDS} />
              <SelectField label="AI experience" name="ai_experience" options={[
                { value: "beginner", label: "Beginner" },
                { value: "intermediate", label: "Intermediate" },
                { value: "power_user", label: "Power User" },
              ]} />
              <SelectField label="Track intent" name="track_intent" options={TRACKS} />
              <SelectField label="Event goal" name="event_goal" options={GOALS} />
              <div className="sm:col-span-2 pt-2">
                <Button type="submit" disabled={loading} className="w-full bg-gradient-hero shadow-glow">
                  {loading ? "Saving…" : "Enter the arena"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, name, ...rest }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} required {...rest} />
    </div>
  );
}

type Opt = string | { value: string; label: string };
function SelectField({ label, name, options }: { label: string; name: string; options: Opt[] }) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Select name={name} required>
        <SelectTrigger id={name}><SelectValue placeholder="Select…" /></SelectTrigger>
        <SelectContent>
          {opts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
