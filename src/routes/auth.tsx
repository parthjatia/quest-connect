import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — EventQuest" }] }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(100),
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>, mode: "signin" | "signup") => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse({ email: form.get("email"), password: form.get("password") });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Welcome aboard! Let's onboard you.");
        navigate({ to: "/onboarding" });
      } else {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Auth failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="bg-gradient-card shadow-card border-border/60">
          <CardHeader>
            <CardTitle className="text-2xl">Enter the quest</CardTitle>
            <CardDescription>Sign in or create your player profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signup">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signup">Sign up</TabsTrigger>
                <TabsTrigger value="signin">Sign in</TabsTrigger>
              </TabsList>
              {(["signup", "signin"] as const).map((mode) => (
                <TabsContent key={mode} value={mode}>
                  <form onSubmit={(e) => submit(e, mode)} className="space-y-4 mt-4">
                    <div className="space-y-1.5">
                      <Label htmlFor={`${mode}-email`}>Email</Label>
                      <Input id={`${mode}-email`} name="email" type="email" autoComplete="email" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`${mode}-password`}>Password</Label>
                      <Input id={`${mode}-password`} name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={6} />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full bg-gradient-hero shadow-glow">
                      {loading ? "..." : mode === "signup" ? "Create account" : "Sign in"}
                    </Button>
                  </form>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
