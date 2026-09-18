import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const staffInput = z.object({
  email: z.string().email(),
  displayName: z.string().trim().min(1).max(120),
  temporaryPassword: z.string().min(8).max(128),
  canAdmissions: z.boolean(),
  canGallery: z.boolean(),
  canNews: z.boolean(),
  canPublish: z.boolean(),
});

export const createStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(staffInput)
  .handler(async ({ data, context }) => {
    const { data: isSuperAdmin, error: accessError } = await context.supabase.rpc("has_super_admin", { _user_id: context.userId });
    if (accessError || !isSuperAdmin) throw new Error("Only the Super Admin can create staff accounts.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: data.displayName },
    });
    if (createError || !created.user) throw new Error(createError?.message ?? "Could not create staff account.");

    const userId = created.user.id;
    const { error: roleError } = await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    const { error: profileError } = await supabaseAdmin.from("staff_profiles").upsert({
      user_id: userId,
      email: data.email,
      display_name: data.displayName,
      is_super_admin: false,
      is_active: true,
      can_admissions: data.canAdmissions,
      can_gallery: data.canGallery,
      can_news: data.canNews,
      can_publish: data.canPublish,
      must_change_password: true,
    });

    if (roleError || profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(roleError?.message ?? profileError?.message ?? "Could not finish staff setup.");
    }

    return { id: userId, email: data.email };
  });
