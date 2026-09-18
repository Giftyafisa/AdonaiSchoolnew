import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminAccess, hasPermission, type AdminAccess } from "@/lib/admin-access";
import { isVideoMedia, removeSiteMedia, uploadSiteMedia } from "@/lib/media";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Eye, Pencil, Play, Plus, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/gallery")({
  component: AdminGallery,
});

type Item = {
  id: string;
  image_url: string | null;
  media_url: string;
  media_type: string;
  mime_type: string | null;
  file_path: string | null;
  caption: string;
  category: string;
  sort_order: number;
  published: boolean;
  approval_status: string;
  author_id: string | null;
};

const CATEGORIES = ["Graduation", "Sports", "Excursions", "Science", "Cultural", "Classroom", "Facilities", "Campus"];

function AdminGallery() {
  const [items, setItems] = useState<Item[]>([]);
  const [editing, setEditing] = useState<Partial<Item> | null>(null);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("gallery_items").select("*").order("sort_order").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Item[]);
    setLoading(false);
  };

  useEffect(() => {
    getAdminAccess().then(setAccess);
    load();
  }, []);

  const save = async () => {
    if (!editing || !access) return;
    if (!hasPermission(access, "gallery")) {
      toast.error("Your account does not have Gallery permission.");
      return;
    }
    if (!editing.media_url || !editing.caption?.trim()) {
      toast.error("Upload media and add a caption before saving.");
      return;
    }
    setSaving(true);
    const wantsPublished = editing.published === true;
    const payload = {
      media_url: editing.media_url,
      image_url: editing.media_type === "image" ? editing.media_url : null,
      media_type: editing.media_type ?? "image",
      mime_type: editing.mime_type ?? null,
      file_path: editing.file_path ?? null,
      caption: editing.caption.trim(),
      category: editing.category ?? "Campus",
      sort_order: Number(editing.sort_order ?? 0),
      published: wantsPublished && access.canPublish,
      approval_status: wantsPublished && access.canPublish ? "published" : "pending",
      author_id: editing.author_id ?? access.userId,
      reviewed_by: wantsPublished && access.canPublish ? access.userId : null,
      reviewed_at: wantsPublished && access.canPublish ? new Date().toISOString() : null,
    };
    const { error } = editing.id
      ? await supabase.from("gallery_items").update(payload).eq("id", editing.id)
      : await supabase.from("gallery_items").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(payload.published ? "Gallery media published" : "Gallery media saved for review");
    setEditing(null);
    load();
  };

  const remove = async (item: Item) => {
    if (!confirm("Delete this gallery item?")) return;
    const { error } = await supabase.from("gallery_items").delete().eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await removeSiteMedia(item.file_path);
    toast.success("Gallery item deleted");
    load();
  };

  const move = async (item: Item, direction: -1 | 1) => {
    const next = items.find((candidate) => candidate.sort_order === item.sort_order + direction);
    if (!next) return;
    const [{ error: firstError }, { error: secondError }] = await Promise.all([
      supabase.from("gallery_items").update({ sort_order: next.sort_order }).eq("id", item.id),
      supabase.from("gallery_items").update({ sort_order: item.sort_order }).eq("id", next.id),
    ]);
    if (firstError || secondError) toast.error((firstError ?? secondError)?.message ?? "Could not reorder media");
    else load();
  };

  const pending = useMemo(() => items.filter((item) => !item.published || item.approval_status === "pending"), [items]);

  if (access && !hasPermission(access, "gallery")) return <PermissionNotice area="Gallery" />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Gallery media</h1>
          <p className="mt-1 text-sm text-muted-foreground">Upload school photos and videos directly from the portal.</p>
        </div>
        <button onClick={() => setEditing({ category: "Campus", sort_order: items.length, media_type: "image", published: access?.canPublish ?? false })} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-glow"><Plus className="h-4 w-4" /> Add media</button>
      </div>

      {pending.length > 0 && <div className="mt-5 rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm"><strong>{pending.length} item{pending.length === 1 ? "" : "s"}</strong> waiting for publication or review.</div>}
      {loading ? <div className="mt-10 text-center text-sm text-muted-foreground">Loading media…</div> : items.length === 0 ? <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No gallery media yet. Add your first photo or video.</div> : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <div key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <MediaPreview item={item} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div><div className="text-xs uppercase tracking-wider text-gold">{item.category}</div><div className="mt-1 text-sm font-medium">{item.caption}</div></div>
                  <div className="flex items-center gap-1">
                    <button aria-label="Move media up" disabled={index === 0} onClick={() => move(item, -1)} className="rounded-md p-2 hover:bg-secondary disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                    <button aria-label="Move media down" disabled={index === items.length - 1} onClick={() => move(item, 1)} className="rounded-md p-2 hover:bg-secondary disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                    <button aria-label="Edit media" onClick={() => setEditing(item)} className="rounded-md p-2 hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                    <button aria-label="Delete media" onClick={() => remove(item)} className="rounded-md p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs"><span className={`rounded-full px-2 py-1 font-semibold ${item.published ? "bg-primary/10 text-primary" : "bg-gold/15 text-gold-foreground"}`}>{item.published ? "Published" : item.approval_status === "pending" ? "Needs review" : "Draft"}</span><a href={item.media_url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"><Eye className="h-3.5 w-3.5" /> Open</a></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <GalleryEditor editing={editing} setEditing={setEditing} save={save} saving={saving} access={access} />}
    </div>
  );
}

function GalleryEditor({ editing, setEditing, save, saving, access }: { editing: Partial<Item>; setEditing: (value: Partial<Item> | null) => void; save: () => void; saving: boolean; access: AdminAccess | null }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const media = await uploadSiteMedia(file, "gallery");
      setEditing({ ...editing, media_url: media.url, image_url: media.type === "image" ? media.url : null, media_type: media.type, mime_type: media.mimeType, file_path: media.path });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not upload media");
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setEditing(null)}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl md:p-8" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="font-display text-xl font-bold">{editing.id ? "Edit gallery media" : "Add gallery media"}</h2><button onClick={() => setEditing(null)} className="rounded-full p-1 hover:bg-secondary"><X className="h-5 w-5" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="text-sm font-medium">Upload image or video<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" disabled={uploading} onChange={(event) => handleFile(event.target.files?.[0])} className="mt-1.5 block w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></label>
          {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
          {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
          {editing.media_url && <MediaPreview item={{ ...editing, media_url: editing.media_url, media_type: editing.media_type ?? "image", caption: editing.caption ?? "Preview" } as Item} />}
          <label className="text-sm font-medium">Caption<input value={editing.caption ?? ""} onChange={(event) => setEditing({ ...editing, caption: event.target.value })} className="mt-1.5 block w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></label>
          <label className="text-sm font-medium">Category<select value={editing.category ?? "Campus"} onChange={(event) => setEditing({ ...editing, category: event.target.value })} className="mt-1.5 block w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm">{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label className="text-sm font-medium">Sort order<input type="number" value={editing.sort_order ?? 0} onChange={(event) => setEditing({ ...editing, sort_order: Number(event.target.value) })} className="mt-1.5 block w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.published} disabled={!access?.canPublish} onChange={(event) => setEditing({ ...editing, published: event.target.checked })} /> Publish now {access?.canPublish ? "" : "(requires publishing permission)"}</label>
        </div>
        <div className="mt-6 flex justify-end gap-2"><button onClick={() => setEditing(null)} className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">Cancel</button><button disabled={saving || uploading} onClick={save} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-glow disabled:opacity-60">{saving ? "Saving…" : "Save media"}</button></div>
      </div>
    </div>
  );
}

function MediaPreview({ item }: { item: Pick<Item, "media_url" | "media_type" | "caption"> }) {
  return <div className="relative aspect-[4/3] bg-secondary">{isVideoMedia(item.media_type) ? <><video src={item.media_url} controls preload="metadata" className="h-full w-full object-cover" /><div className="pointer-events-none absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white"><Play className="h-4 w-4" /></div></> : <img src={item.media_url} alt={item.caption} className="h-full w-full object-cover" />}</div>;
}

function PermissionNotice({ area }: { area: string }) {
  return <div className="rounded-2xl border border-border bg-card p-8"><h1 className="font-display text-2xl font-bold">{area} access is restricted</h1><p className="mt-2 text-sm text-muted-foreground">Ask the Super Admin to enable this area for your staff account.</p></div>;
}
