import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminAccess, hasPermission, type AdminAccess } from "@/lib/admin-access";
import { removeSiteMedia, uploadSiteMedia } from "@/lib/media";
import { RichTextEditor, sanitizeRichHtml } from "@/lib/rich-text";
import { toast } from "sonner";
import { Archive, Check, FileText, Pencil, Plus, Send, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/news")({
  component: AdminNews,
});

type Post = {
  id: string; title: string; slug: string; excerpt: string | null; body: string | null; image_url: string | null; cover_media_type: string;
  cover_video_url: string | null; document_url: string | null; document_name: string | null; document_path: string | null; category: string;
  published: boolean; published_at: string | null; approval_status: string; archived: boolean; author_id: string | null; created_at: string;
};

const CATEGORIES = ["School News", "Academic Achievements", "Admissions Updates", "Sports Activities", "Upcoming Events", "Reports", "Announcements", "Notices"];

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80); }

function AdminNews() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [editing, setEditing] = useState<Partial<Post> | null>(null);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("news_posts").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setPosts((data ?? []) as Post[]);
    setLoading(false);
  };
  useEffect(() => { getAdminAccess().then(setAccess); load(); }, []);

  const save = async () => {
    if (!editing || !access) return;
    if (!hasPermission(access, "news")) { toast.error("Your account does not have News permission."); return; }
    const wantsPublished = editing.published === true;
    const payload = {
      title: editing.title?.trim() ?? "",
      slug: editing.slug?.trim() || slugify(editing.title ?? ""),
      excerpt: editing.excerpt?.trim() || null,
      body: editing.body ? sanitizeRichHtml(editing.body) : null,
      image_url: editing.cover_media_type === "image" ? editing.image_url ?? null : null,
      cover_media_type: editing.cover_media_type ?? "image",
      cover_video_url: editing.cover_media_type === "video" ? editing.cover_video_url ?? null : null,
      document_url: editing.document_url ?? null,
      document_name: editing.document_name ?? null,
      document_path: editing.document_path ?? null,
      category: editing.category ?? "School News",
      published: wantsPublished && access.canPublish,
      approval_status: wantsPublished && access.canPublish ? "published" : wantsPublished ? "pending" : "draft",
      published_at: wantsPublished && access.canPublish ? (editing.published_at ?? new Date().toISOString()) : null,
      author_id: editing.author_id ?? access.userId,
      reviewed_by: wantsPublished && access.canPublish ? access.userId : null,
      reviewed_at: wantsPublished && access.canPublish ? new Date().toISOString() : null,
    };
    if (!payload.title) { toast.error("Title is required"); return; }
    const { error } = editing.id ? await supabase.from("news_posts").update(payload).eq("id", editing.id) : await supabase.from("news_posts").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(payload.published ? "News published" : payload.approval_status === "pending" ? "Submitted for approval" : "Draft saved");
    setEditing(null);
    load();
  };

  const remove = async (post: Post) => {
    if (!confirm("Delete this news post?")) return;
    const { error } = await supabase.from("news_posts").delete().eq("id", post.id);
    if (error) { toast.error(error.message); return; }
    await removeSiteMedia(post.document_path);
    toast.success("News post deleted");
    load();
  };

  const archive = async (post: Post) => {
    const { error } = await supabase.from("news_posts").update({ archived: !post.archived, published: false }).eq("id", post.id);
    if (error) toast.error(error.message); else { toast.success(post.archived ? "Post restored" : "Post archived"); load(); }
  };

  const filtered = useMemo(() => posts.filter((post) => !post.archived && (filter === "all" || (filter === "published" ? post.published : post.approval_status === filter))), [posts, filter]);
  if (access && !hasPermission(access, "news")) return <PermissionNotice />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-display text-3xl font-bold">News & school updates</h1><p className="mt-1 text-sm text-muted-foreground">Create announcements, notices, reports, events and rich school stories.</p></div><button onClick={() => setEditing({ category: "School News", cover_media_type: "image", published: access?.canPublish ?? false })} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-glow"><Plus className="h-4 w-4" /> New post</button></div>
      <div className="mt-6 flex flex-wrap gap-2">{["all", "published", "pending", "draft"].map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${filter === value ? "bg-primary text-primary-foreground" : "border border-border bg-card hover:border-primary hover:text-primary"}`}>{value}</button>)}</div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card"><table className="w-full text-left text-sm"><thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="p-3">Title</th><th className="p-3">Category</th><th className="p-3">Status</th><th className="p-3">Date</th><th className="p-3"></th></tr></thead><tbody>{loading && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}{!loading && filtered.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No posts in this view.</td></tr>}{filtered.map((post) => <tr key={post.id} className="border-t border-border"><td className="p-3 font-medium">{post.title}</td><td className="p-3 text-muted-foreground">{post.category}</td><td className="p-3"><StatusBadge post={post} /></td><td className="p-3 text-muted-foreground">{new Date(post.published_at ?? post.created_at).toLocaleDateString()}</td><td className="p-3 text-right"><button onClick={() => setEditing(post)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /> Edit</button><button onClick={() => archive(post)} className="ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-secondary"><Archive className="h-3.5 w-3.5" /> Archive</button><button onClick={() => remove(post)} className="ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /> Delete</button></td></tr>)}</tbody></table></div>
      {editing && <NewsEditor editing={editing} setEditing={setEditing} save={save} access={access} />}
    </div>
  );
}

function NewsEditor({ editing, setEditing, save, access }: { editing: Partial<Post>; setEditing: (value: Partial<Post> | null) => void; save: () => void; access: AdminAccess | null }) {
  const [uploading, setUploading] = useState("");
  const upload = async (file: File | undefined, kind: "cover" | "document") => {
    if (!file) return;
    setUploading(kind);
    try {
      const media = await uploadSiteMedia(file, "news");
      if (kind === "cover") setEditing({ ...editing, image_url: media.type === "image" ? media.url : null, cover_video_url: media.type === "video" ? media.url : null, cover_media_type: media.type });
      else setEditing({ ...editing, document_url: media.url, document_name: media.name, document_path: media.path });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not upload media"); } finally { setUploading(""); }
  };
  const uploadInline = async (file: File) => (await uploadSiteMedia(file, "news-inline")).url;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setEditing(null)}><div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl md:p-8" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><h2 className="font-display text-xl font-bold">{editing.id ? "Edit news post" : "New news post"}</h2><p className="mt-1 text-xs text-muted-foreground">Choose only the media you need for this update.</p></div><button onClick={() => setEditing(null)} className="rounded-full p-1 hover:bg-secondary"><X className="h-5 w-5" /></button></div><div className="mt-5 grid gap-4"><Input label="Title" value={editing.title ?? ""} onChange={(value) => setEditing({ ...editing, title: value, slug: editing.id ? editing.slug : slugify(value) })} /><div className="grid gap-4 md:grid-cols-2"><Input label="Slug" value={editing.slug ?? ""} onChange={(value) => setEditing({ ...editing, slug: value })} /><label className="text-sm font-medium">Category<select value={editing.category ?? "School News"} onChange={(event) => setEditing({ ...editing, category: event.target.value })} className="mt-1.5 block w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm">{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label></div><label className="text-sm font-medium">Excerpt<textarea value={editing.excerpt ?? ""} onChange={(event) => setEditing({ ...editing, excerpt: event.target.value })} rows={2} className="mt-1.5 block w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></label><div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">Cover image or video<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" disabled={!!uploading} onChange={(event) => upload(event.target.files?.[0], "cover")} className="mt-1.5 block w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />{uploading === "cover" && <span className="mt-1 block text-xs text-muted-foreground">Uploading…</span>}</label><label className="text-sm font-medium">PDF or document attachment<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={!!uploading} onChange={(event) => upload(event.target.files?.[0], "document")} className="mt-1.5 block w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" />{editing.document_name && <span className="mt-1 block text-xs text-muted-foreground">{editing.document_name}</span>}</label></div>{editing.image_url && <img src={editing.image_url} alt="Cover preview" className="max-h-64 w-full rounded-xl object-cover" />}{editing.cover_video_url && <video src={editing.cover_video_url} controls className="max-h-64 w-full rounded-xl" />}<label className="text-sm font-medium">Article body<RichTextEditor value={editing.body ?? ""} onChange={(value) => setEditing({ ...editing, body: value })} onUpload={uploadInline} /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editing.published} disabled={!access?.canPublish} onChange={(event) => setEditing({ ...editing, published: event.target.checked })} /> Publish immediately {access?.canPublish ? "" : "(your post will be sent for approval)"}</label></div><div className="mt-6 flex justify-end gap-2"><button onClick={() => setEditing(null)} className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">Cancel</button><button onClick={save} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-glow"><Send className="h-4 w-4" /> Save post</button></div></div></div>;
}

function StatusBadge({ post }: { post: Post }) { const label = post.published ? "Published" : post.approval_status === "pending" ? "Needs approval" : "Draft"; return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${post.published ? "bg-primary/10 text-primary" : post.approval_status === "pending" ? "bg-gold/15 text-gold-foreground" : "bg-muted text-muted-foreground"}`}>{post.published && <Check className="mr-1 inline h-3 w-3" />}{label}</span>; }
function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="text-sm font-medium">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" /></label>; }
function PermissionNotice() { return <div className="rounded-2xl border border-border bg-card p-8"><h1 className="font-display text-2xl font-bold">News access is restricted</h1><p className="mt-2 text-sm text-muted-foreground">Ask the Super Admin to enable News permission for your staff account.</p></div>; }
