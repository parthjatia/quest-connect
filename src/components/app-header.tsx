import { Link, useNavigate } from "@tanstack/react-router";
import { Sparkles, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

export function AppHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return setIsAdmin(false);
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="border-b border-[#39ff14]/20 bg-black/60 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-xl tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-md border border-[#39ff14]/50 bg-[#39ff14]/10 shadow-[0_0_18px_-2px_rgba(57,255,20,0.6)]">
            <Sparkles className="h-4 w-4 text-[#39ff14]" />
          </span>
          <span className="text-neon-shine">Quey</span>
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/play">Play</Link></Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/recap"><Sparkles className="mr-1 h-4 w-4" />Recap</Link>
              </Button>
              {isAdmin && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin"><Shield className="mr-1 h-4 w-4" />Admin</Link>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button asChild size="sm"><Link to="/auth">Sign in</Link></Button>
          )}
        </nav>
      </div>
    </header>
  );
}
