import { supabase } from "@/integrations/supabase/client";

export type StaffProfile = {
  user_id: string;
  email: string;
  display_name: string;
  is_super_admin: boolean;
  is_active: boolean;
  can_admissions: boolean;
  can_gallery: boolean;
  can_news: boolean;
  can_publish: boolean;
  must_change_password: boolean;
};

export type AdminAccess = {
  userId: string;
  email: string;
  profile: StaffProfile;
  isSuperAdmin: boolean;
  canAdmissions: boolean;
  canGallery: boolean;
  canNews: boolean;
  canPublish: boolean;
};

export async function getAdminAccess(): Promise<AdminAccess | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const [{ data: roleRows }, { data: profile }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("staff_profiles").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  if (!(roleRows ?? []).some((row) => row.role === "admin")) return null;

  const resolvedProfile = (profile ?? {
    user_id: user.id,
    email: user.email ?? "",
    display_name: user.user_metadata?.full_name ?? "",
    is_super_admin: false,
    is_active: true,
    can_admissions: true,
    can_gallery: true,
    can_news: true,
    can_publish: true,
    must_change_password: false,
  }) as StaffProfile;

  if (!resolvedProfile.is_active) return null;
  const isSuperAdmin = resolvedProfile.is_super_admin;

  return {
    userId: user.id,
    email: user.email ?? resolvedProfile.email,
    profile: resolvedProfile,
    isSuperAdmin,
    canAdmissions: isSuperAdmin || resolvedProfile.can_admissions,
    canGallery: isSuperAdmin || resolvedProfile.can_gallery,
    canNews: isSuperAdmin || resolvedProfile.can_news,
    canPublish: isSuperAdmin || resolvedProfile.can_publish,
  };
}

export function hasPermission(access: AdminAccess | null, permission: "admissions" | "gallery" | "news" | "publish") {
  if (!access) return false;
  if (access.isSuperAdmin) return true;
  return {
    admissions: access.canAdmissions,
    gallery: access.canGallery,
    news: access.canNews,
    publish: access.canPublish,
  }[permission];
}
