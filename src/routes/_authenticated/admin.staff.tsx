import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminAccess, type AdminAccess, type StaffProfile } from "@/lib/admin-access";
import { createStaffAccount } from "@/lib/api/admin.functions";
import { toast } from "sonner";
import { Check, Plus, Shield, UserRound, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/staff")({ component: AdminStaff });

type StaffForm = { email: string; displayName: string; temporaryPassword: string; canAdmissions: boolean; canGallery: boolean; canNews: boolean; canPublish: boolean };
const emptyForm: StaffForm = { email: "", displayName: "", temporaryPassword: "", canAdmissions: true, canGallery: true, canNews: true, canPublish: false };

function AdminStaff() {
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [form, setForm] = useState<StaffForm>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("staff_profiles").select("*").order("created_at");
    if (error) toast.error(error.message); else setStaff((data ?? []) as StaffProfile[]);
  };
  useEffect(() => { getAdminAccess().then((result) => { setAccess(result); if (result?.isSuperAdmin) load(); }); }, []);

  const submit = async () => {
    if (!form.email || !form.displayName || form.temporaryPassword.length < 8) { toast.error("Enter a name, email and password of at least 8 characters."); return; }
    setSaving(true);
    try { await createStaffAccount({ data: form }); toast.success("Staff account created"); setForm(emptyForm); setShowForm(false); load(); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not create staff account"); } finally { setSaving(false); }
  };

  const update = async (profile: StaffProfile, patch: Partial<StaffProfile>) => {
    const { error } = await supabase.from("staff_profiles").update(patch).eq("user_id", profile.user_id);
    if (error) toast.error(error.message); else { toast.success("Permissions updated"); load(); }
  };

  if (!access?.isSuperAdmin) return <div className="rounded-2xl border border-border bg-card p-8"><h1 className="font-display text-2xl font-bold">Staff management is restricted</h1><p className="mt-2 text-sm text-muted-foreground">Only the school owner Super Admin can manage staff accounts.</p></div>;
  return <div><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-display text-3xl font-bold">Staff access</h1><p className="mt-1 text-sm text-muted-foreground">Create staff accounts and limit what each person can manage or publish.</p></div><button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-glow"><Plus className="h-4 w-4" /> Add staff</button></div><div className="mt-6 space-y-3">{staff.map((profile) => <div key={profile.user_id} className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></div><div><div className="font-semibold">{profile.display_name || profile.email}</div><div className="text-sm text-muted-foreground">{profile.email} {profile.is_super_admin && <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-primary"><Shield className="h-3 w-3" /> Super Admin</span>}</div></div></div>{!profile.is_super_admin && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={profile.is_active} onChange={(event) => update(profile, { is_active: event.target.checked })} /> Active</label>}</div>{!profile.is_super_admin && <div className="mt-4 grid gap-2 sm:grid-cols-4">{([["can_admissions", "Admissions"], ["can_gallery", "Gallery"], ["can_news", "News"], ["can_publish", "Publish"]] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm"><input type="checkbox" checked={profile[key]} onChange={(event) => update(profile, { [key]: event.target.checked })} /> {label}</label>)}</div>}</div>)}</div>{showForm && <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setShowForm(false)}><div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl md:p-8" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><h2 className="font-display text-xl font-bold">Create staff account</h2><p className="mt-1 text-xs text-muted-foreground">Give the staff member this temporary password. They should change it after sign-in.</p></div><button onClick={() => setShowForm(false)} className="rounded-full p-1 hover:bg-secondary"><X className="h-5 w-5" /></button></div><div className="mt-5 grid gap-4"><Input label="Full name" value={form.displayName} onChange={(displayName) => setForm({ ...form, displayName })} /><Input label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} /><Input label="Temporary password" type="password" value={form.temporaryPassword} onChange={(temporaryPassword) => setForm({ ...form, temporaryPassword })} /><div className="grid gap-2 sm:grid-cols-2">{([["canAdmissions", "Admissions"], ["canGallery", "Gallery"], ["canNews", "News"], ["canPublish", "Publish immediately"]] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm"><input type="checkbox" checked={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.checked })} /> {label}</label>)}</div></div><button onClick={submit} disabled={saving} className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"><Check className="h-4 w-4" /> {saving ? "Creating…" : "Create account"}</button></div></div>}</div>;
}
function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="text-sm font-medium">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></label>; }
