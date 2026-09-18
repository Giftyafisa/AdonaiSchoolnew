
-- Admin portal workflow extensions

CREATE TABLE IF NOT EXISTS public.staff_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  is_super_admin BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  can_admissions BOOLEAN NOT NULL DEFAULT true,
  can_gallery BOOLEAN NOT NULL DEFAULT true,
  can_news BOOLEAN NOT NULL DEFAULT true,
  can_publish BOOLEAN NOT NULL DEFAULT true,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.staff_profiles TO authenticated;
GRANT UPDATE ON public.staff_profiles TO authenticated;
GRANT ALL ON public.staff_profiles TO service_role;

INSERT INTO public.staff_profiles (user_id, email, display_name, is_super_admin)
SELECT ur.user_id, COALESCE(au.email, ''), COALESCE(au.raw_user_meta_data ->> 'full_name', ''), true
FROM public.user_roles ur
LEFT JOIN auth.users au ON au.id = ur.user_id
WHERE ur.role = 'admin'
ON CONFLICT (user_id) DO UPDATE SET is_super_admin = true, is_active = true;

CREATE OR REPLACE FUNCTION public.has_staff_permission(_user_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    LEFT JOIN public.staff_profiles sp ON sp.user_id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = 'admin'
      AND COALESCE(sp.is_active, true)
      AND (
        COALESCE(sp.is_super_admin, true)
        OR (_permission = 'admissions' AND COALESCE(sp.can_admissions, true))
        OR (_permission = 'gallery' AND COALESCE(sp.can_gallery, true))
        OR (_permission = 'news' AND COALESCE(sp.can_news, true))
        OR (_permission = 'publish' AND COALESCE(sp.can_publish, true))
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.has_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    LEFT JOIN public.staff_profiles sp ON sp.user_id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = 'admin'
      AND COALESCE(sp.is_active, true)
      AND COALESCE(sp.is_super_admin, true)
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_staff_permission(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_super_admin(UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_super_admin(auth.uid()));
CREATE POLICY "Super admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_super_admin(auth.uid()))
  WITH CHECK (public.has_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff view profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Super admins manage profiles" ON public.staff_profiles;
CREATE POLICY "Staff view profiles" ON public.staff_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_super_admin(auth.uid()));
CREATE POLICY "Super admins manage profiles" ON public.staff_profiles
  FOR UPDATE TO authenticated
  USING (public.has_super_admin(auth.uid()))
  WITH CHECK (public.has_super_admin(auth.uid()));

DROP TRIGGER IF EXISTS staff_profiles_updated_at ON public.staff_profiles;
CREATE TRIGGER staff_profiles_updated_at
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Applications
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS religion TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS tribe TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS previous_school TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS mother_name TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS mother_language TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS mother_occupation TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS mother_phone TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS father_language TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS father_occupation TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS father_phone TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS house_number TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS documents JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Anyone can apply" ON public.applications;
CREATE POLICY "Anyone can apply" ON public.applications
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'new'
    AND archived = false
    AND internal_notes IS NULL
    AND length(trim(parent_name)) > 1
    AND length(trim(child_name)) > 1
    AND length(trim(email)) > 3
    AND length(trim(phone)) > 5
  );
DROP POLICY IF EXISTS "Admins view applications" ON public.applications;
CREATE POLICY "Admissions staff view applications" ON public.applications
  FOR SELECT TO authenticated
  USING (public.has_staff_permission(auth.uid(), 'admissions'));
DROP POLICY IF EXISTS "Admins update applications" ON public.applications;
CREATE POLICY "Admissions staff update applications" ON public.applications
  FOR UPDATE TO authenticated
  USING (public.has_staff_permission(auth.uid(), 'admissions'))
  WITH CHECK (public.has_staff_permission(auth.uid(), 'admissions'));
DROP POLICY IF EXISTS "Admins delete applications" ON public.applications;
CREATE POLICY "Admissions staff delete applications" ON public.applications
  FOR DELETE TO authenticated
  USING (public.has_staff_permission(auth.uid(), 'admissions'));

-- Gallery media and approvals
ALTER TABLE public.gallery_items ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image';
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS review_notes TEXT;
UPDATE public.gallery_items SET media_url = image_url WHERE media_url IS NULL;
ALTER TABLE public.gallery_items ALTER COLUMN media_url SET NOT NULL;

DROP POLICY IF EXISTS "Anyone reads gallery" ON public.gallery_items;
CREATE POLICY "Anyone reads published gallery" ON public.gallery_items
  FOR SELECT TO anon, authenticated
  USING (published = true OR public.has_staff_permission(auth.uid(), 'gallery'));
DROP POLICY IF EXISTS "Admins manage gallery" ON public.gallery_items;
CREATE POLICY "Gallery staff manage gallery" ON public.gallery_items
  FOR ALL TO authenticated
  USING (public.has_staff_permission(auth.uid(), 'gallery'))
  WITH CHECK (
    public.has_staff_permission(auth.uid(), 'gallery')
    AND (published = false OR public.has_staff_permission(auth.uid(), 'publish'))
  );

-- News content, approvals, and attachments
ALTER TABLE public.news_posts ADD COLUMN IF NOT EXISTS cover_media_type TEXT NOT NULL DEFAULT 'image';
ALTER TABLE public.news_posts ADD COLUMN IF NOT EXISTS cover_video_url TEXT;
ALTER TABLE public.news_posts ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE public.news_posts ADD COLUMN IF NOT EXISTS document_name TEXT;
ALTER TABLE public.news_posts ADD COLUMN IF NOT EXISTS document_path TEXT;
ALTER TABLE public.news_posts ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE public.news_posts ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.news_posts ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.news_posts ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.news_posts ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE public.news_posts ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
UPDATE public.news_posts
SET approval_status = CASE WHEN published THEN 'published' ELSE 'draft' END
WHERE approval_status = 'draft' AND published = true;

DROP POLICY IF EXISTS "Anyone reads published news" ON public.news_posts;
CREATE POLICY "Anyone reads published news" ON public.news_posts
  FOR SELECT TO anon, authenticated
  USING ((published = true AND archived = false) OR public.has_staff_permission(auth.uid(), 'news'));
DROP POLICY IF EXISTS "Admins manage news" ON public.news_posts;
CREATE POLICY "News staff manage news" ON public.news_posts
  FOR ALL TO authenticated
  USING (public.has_staff_permission(auth.uid(), 'news'))
  WITH CHECK (public.has_staff_permission(auth.uid(), 'news'));

CREATE OR REPLACE FUNCTION public.enforce_publishing_permission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.published = true
    AND (TG_OP = 'INSERT' OR OLD.published = false)
    AND NOT public.has_staff_permission(auth.uid(), 'publish') THEN
    RAISE EXCEPTION 'Publishing permission is required';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gallery_items_publishing_permission ON public.gallery_items;
CREATE TRIGGER gallery_items_publishing_permission
  BEFORE INSERT OR UPDATE ON public.gallery_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_publishing_permission();
DROP TRIGGER IF EXISTS news_posts_publishing_permission ON public.news_posts;
CREATE TRIGGER news_posts_publishing_permission
  BEFORE INSERT OR UPDATE ON public.news_posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_publishing_permission();

CREATE OR REPLACE FUNCTION public.mark_password_changed(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cannot update another user';
  END IF;
  UPDATE public.staff_profiles SET must_change_password = false WHERE user_id = _user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_password_changed(UUID) TO authenticated;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('site-media', 'site-media', true, 52428800, ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime','application/pdf']),
  ('application-documents', 'application-documents', false, 10485760, ARRAY['application/pdf','image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public reads site media" ON storage.objects;
DROP POLICY IF EXISTS "Staff upload site media" ON storage.objects;
DROP POLICY IF EXISTS "Staff update site media" ON storage.objects;
DROP POLICY IF EXISTS "Staff delete site media" ON storage.objects;
DROP POLICY IF EXISTS "Applicants upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admissions staff read documents" ON storage.objects;
DROP POLICY IF EXISTS "Admissions staff delete documents" ON storage.objects;

CREATE POLICY "Public reads site media" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'site-media');
CREATE POLICY "Staff upload site media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'site-media'
    AND (public.has_staff_permission(auth.uid(), 'gallery') OR public.has_staff_permission(auth.uid(), 'news'))
  );
CREATE POLICY "Staff update site media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'site-media'
    AND (public.has_staff_permission(auth.uid(), 'gallery') OR public.has_staff_permission(auth.uid(), 'news'))
  )
  WITH CHECK (
    bucket_id = 'site-media'
    AND (public.has_staff_permission(auth.uid(), 'gallery') OR public.has_staff_permission(auth.uid(), 'news'))
  );
CREATE POLICY "Staff delete site media" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'site-media'
    AND (public.has_staff_permission(auth.uid(), 'gallery') OR public.has_staff_permission(auth.uid(), 'news'))
  );

CREATE POLICY "Applicants upload documents" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'application-documents'
    AND (storage.extension(name) IN ('pdf', 'jpg', 'jpeg', 'png', 'webp'))
    AND (lower(name) LIKE 'applications/%')
  );
CREATE POLICY "Admissions staff read documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'application-documents' AND public.has_staff_permission(auth.uid(), 'admissions'));
CREATE POLICY "Admissions staff delete documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'application-documents' AND public.has_staff_permission(auth.uid(), 'admissions'));
