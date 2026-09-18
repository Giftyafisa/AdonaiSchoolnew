import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { FileText, ArrowLeft, Calendar, Tag, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isVideoMedia } from "@/lib/media";
import { sanitizeRichHtml } from "@/lib/rich-text";

export const Route = createFileRoute("/news/$slug")({
  head: ({ params }) => ({
    meta: [{ title: `News | Adonai International School` }, { property: "og:url", content: `/news/${params.slug}` }],
  }),
  component: NewsArticle,
});

type Post = { title: string; excerpt: string | null; body: string | null; image_url: string | null; cover_media_type: string; cover_video_url: string | null; document_url: string | null; document_name: string | null; category: string; published_at: string | null; created_at: string };

function NewsArticle() {
  const { slug } = useParams({ from: "/news/$slug" });
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { supabase.from("news_posts").select("title,excerpt,body,image_url,cover_media_type,cover_video_url,document_url,document_name,category,published_at,created_at").eq("slug", slug).eq("published", true).eq("archived", false).maybeSingle().then(({ data }) => { setPost(data as Post | null); setLoading(false); }); }, [slug]);
  if (loading) return <SiteLayout><div className="container-x section-pad text-sm text-muted-foreground">Loading article…</div></SiteLayout>;
  if (!post) return <SiteLayout><PageHero eyebrow="News" title="Article not found." subtitle="This update may have been archived or is not published yet." /><div className="container-x section-pad"><Link to="/news" className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" /> Back to news</Link></div></SiteLayout>;
  return <SiteLayout><PageHero eyebrow={post.category} title={post.title} subtitle={post.excerpt ?? "Updates from across Adonai International School."} /><article className="section-pad"><div className="container-x max-w-4xl"><div className="flex flex-wrap gap-4 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Tag className="h-3.5 w-3.5 text-gold" /> {post.category}</span><span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(post.published_at ?? post.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}</span></div>{isVideoMedia(post.cover_media_type) && post.cover_video_url ? <div className="relative mt-8 overflow-hidden rounded-2xl bg-secondary"><video src={post.cover_video_url} controls className="max-h-[520px] w-full" /><Play className="pointer-events-none absolute left-5 top-5 h-5 w-5 rounded-full bg-black/60 p-1 text-white" /></div> : post.image_url ? <img src={post.image_url} alt={post.title} className="mt-8 max-h-[520px] w-full rounded-2xl object-cover" /> : null}<div className="prose prose-sm mt-10 max-w-none md:prose-base [&_a]:text-primary [&_a]:underline" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(post.body ?? `<p>${post.excerpt ?? ""}</p>`) }} />{post.document_url && <a href={post.document_url} target="_blank" rel="noopener" download={post.document_name ?? undefined} className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold hover:border-primary hover:text-primary"><FileText className="h-4 w-4" /> Download {post.document_name ?? "attached document"}</a>}<div className="mt-10 border-t border-border pt-6"><Link to="/news" className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" /> Back to all news</Link></div></div></article></SiteLayout>;
}
