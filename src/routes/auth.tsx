import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { toast } from "sonner";
import { Lock, Mail, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Staff Sign In | Adonai International School" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "change-password">("signin");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { data: profile } = await supabase.from("staff_profiles").select("must_change_password").eq("user_id", data.session.user.id).maybeSingle();
      if (profile?.must_change_password) { setMustChangePassword(true); setMode("change-password"); } else navigate({ to: "/admin" });
    })();
  }, [navigate]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "change-password") {
        if (newPassword.length < 8) throw new Error("Your new password must be at least 8 characters.");
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        const { error: profileError } = await supabase.rpc("mark_password_changed", { _user_id: (await supabase.auth.getUser()).data.user?.id ?? "" });
        if (profileError) throw profileError;
        toast.success("Password updated");
        navigate({ to: "/admin" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: userData } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from("staff_profiles").select("must_change_password").eq("user_id", userData.user?.id ?? "").maybeSingle();
        if (profile?.must_change_password) { setMustChangePassword(true); setMode("change-password"); } else navigate({ to: "/admin" });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally { setLoading(false); }
  };

  return <SiteLayout><section className="section-pad bg-secondary/40"><div className="container-x grid place-items-center"><div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)] md:p-10"><div className="mb-6 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground"><ShieldCheck className="h-5 w-5" /></div><div><h1 className="font-display text-2xl font-bold">Staff Portal</h1><p className="text-xs text-muted-foreground">{mode === "signin" ? "Sign in to manage the website" : "Set your new staff password"}</p></div></div><form onSubmit={onSubmit} className="space-y-4">{mode === "signin" ? <><label className="block text-sm font-medium">Email<div className="mt-1.5 flex items-center gap-2 rounded-xl border border-input bg-background px-3"><Mail className="h-4 w-4 text-muted-foreground" /><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-transparent py-2.5 text-sm outline-none" /></div></label><label className="block text-sm font-medium">Password<div className="mt-1.5 flex items-center gap-2 rounded-xl border border-input bg-background px-3"><Lock className="h-4 w-4 text-muted-foreground" /><input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-transparent py-2.5 text-sm outline-none" /></div></label></> : <label className="block text-sm font-medium">New password<div className="mt-1.5 flex items-center gap-2 rounded-xl border border-input bg-background px-3"><Lock className="h-4 w-4 text-muted-foreground" /><input type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="w-full bg-transparent py-2.5 text-sm outline-none" /></div></label>}<button type="submit" disabled={loading} className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-glow disabled:opacity-60">{loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Save new password"}</button></form><p className="mt-4 text-center text-[11px] text-muted-foreground"><Link to="/" className="hover:text-primary">← Back to website</Link></p>{mustChangePassword && <p className="mt-4 rounded-xl bg-gold/10 p-3 text-center text-xs text-gold-foreground">Your Super Admin assigned a temporary password. Change it before entering the portal.</p>}</div></div></section></SiteLayout>;
}
