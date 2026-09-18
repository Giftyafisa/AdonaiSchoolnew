import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Calendar, FileText, Play, Tag, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isVideoMedia } from "@/lib/media";
import graduation from "@/assets/GRADUATION.jpeg";
import sports from "@/assets/SPORTS.jpeg";
import jhs from "@/assets/Jhs.jpeg";
import cultural from "@/assets/Cultural.jpeg";
import ict from "@/assets/academic-coordinator.jpg";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "News & Events | Adonai International School" },
      { name: "description", content: "Latest news, academic achievements, sports updates and upcoming events at Adonai International School, Tema West." },
      { property: "og:title", content: "News & Events — Adonai International School" },
      { property: "og:description", content: "Stay up to date with Adonai school news, events and achievements." },
      { property: "og:url", content: "/news" },
    ],
    links: [{ rel: "canonical", href: "/news" }],
  }),
  component: News,
});

type Post = { id: string; title: string; slug: string; excerpt: string | null; body: string | null; image_url: string | null; cover_media_type: string; cover_video_url: string | null; document_url: string | null; document_name: string | null; category: string; published_at: string | null; created_at: string };

const fallback: Post[] = [
  { id: "f1", slug: "class-of-2025-celebrates-jhs-graduation", title: "Class of 2025 celebrates JHS graduation", excerpt: "Our JHS 3 leavers were celebrated in a beautiful ceremony attended by parents, staff and dignitaries.", body: null, image_url: graduation, cover_media_type: "image", cover_video_url: null, document_url: null, document_name: null, category: "School News", published_at: "2025-07-12", created_at: "2025-07-12" },
  { id: "f2", slug: "adonai-pupils-sweep-inter-school-science-fair", title: "Adonai pupils sweep inter-school science fair", excerpt: "Three first-place awards across robotics, biology and physics categories.", body: null, image_url: jhs, cover_media_type: "image", cover_video_url: null, document_url: null, document_name: null, category: "Academic Achievements", published_at: "2025-05-22", created_at: "2025-05-22" },
  { id: "f3", slug: "annual-sports-day-brings-the-community-together", title: "Annual sports day brings the community together", excerpt: "A joyful day of athletics, football and tug-of-war across four houses.", body: null, image_url: sports, cover_media_type: "image", cover_video_url: null, document_url: null, document_name: null, category: "Sports Activities", published_at: "2025-03-08", created_at: "2025-03-08" },
  { id: "f4", slug: "cultural-day-showcases-ghanas-heritage", title: "Cultural day showcases Ghana's heritage", excerpt: "Pupils dazzled in kente and traditional dress with dance, drumming and storytelling.", body: null, image_url: cultural, cover_media_type: "image", cover_video_url: null, document_url: null, document_name: null, category: "School News", published_at: "2025-02-15", created_at: "2025-02-15" },
  { id: "f5", slug: "new-ict-lab-officially-opens", title: "New ICT lab officially opens", excerpt: "A modern, fully equipped lab now serves Primary 4 through JHS 3.", body: null, image_url: ict, cover_media_type: "image", cover_video_url: null, document_url: null, document_name: null, category: "School News", published_at: "2024-11-04", created_at: "2024-11-04" },
];

const categories = ["All", "School News", "Academic Achievements", "Admissions Updates", "Sports Activities", "Upcoming Events", "Reports", "Announcements", "Notices"];

function News() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [active, setActive] = useState("All");

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from("news_posts").select("id,title,slug,excerpt,body,image_url,cover_media_type,cover_video_url,document_url,document_name,category,published_at,created_at").eq("published", true).eq("archived", false).order("published_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
        if (error) throw error;
        setPosts(data && data.length > 0 ? data as Post[] : fallback);
      } catch (loadError) {
        console.error("Failed to load news posts:", loadError);
        setPosts(fallback);
      }
    })();
  }, []);

  const list = useMemo(() => { const source = posts ?? []; return active === "All" ? source : source.filter((post) => post.category === active); }, [posts, active]);

  return <SiteLayout><PageHero eyebrow="News & Events" title="What's happening at Adonai." subtitle="Achievements, announcements and stories from across the school." /><section className="section-pad"><div className="container-x"><div className="flex flex-wrap gap-2">{categories.map((category) => <button key={category} onClick={() => setActive(category)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${active === category ? "bg-primary text-primary-foreground" : "border border-border bg-card hover:border-primary hover:text-primary"}`}>{category}</button>)}</div>{posts === null ? <p className="mt-10 text-sm text-muted-foreground">Loading latest news…</p> : list.length === 0 ? <p className="mt-10 text-sm text-muted-foreground">No posts in this category yet.</p> : <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{list.map((post) => <article key={post.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)]"><Cover post={post} /><div className="p-6"><div className="flex items-center gap-4 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Tag className="h-3.5 w-3.5 text-gold" />{post.category}</span><span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(post.published_at ?? post.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })}</span></div><h2 className="mt-3 font-display text-lg font-semibold leading-snug">{post.title}</h2>{post.excerpt && <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>}<div className="mt-4 flex flex-wrap items-center gap-3">{post.document_url && <a href={post.document_url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><FileText className="h-3.5 w-3.5" /> {post.document_name ?? "Download document"}</a>}<Link to="/news/$slug" params={{ slug: post.slug }} className="inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">Read more <ArrowRight className="h-4 w-4" /></Link></div></div></article>)}</div>}</div></section></SiteLayout>;
}

function Cover({ post }: { post: Post }) { return <div className="relative aspect-[16/10] overflow-hidden bg-secondary">{isVideoMedia(post.cover_media_type) && post.cover_video_url ? <><video src={post.cover_video_url} controls preload="metadata" className="h-full w-full object-cover" /><div className="pointer-events-none absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white"><Play className="h-4 w-4" /></div></> : post.image_url ? <img src={post.image_url} alt={post.title} loading="lazy" width={1200} height={800} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" /> : <div className="grid h-full place-items-center text-sm text-muted-foreground">Adonai School News</div>}</div>; }
