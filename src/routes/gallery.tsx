import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { X, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isVideoMedia } from "@/lib/media";
import graduation from "@/assets/GRADUATION.jpeg";
import sports from "@/assets/SPORTS.jpeg";
import excursion from "@/assets/EXCURSION1.jpeg";
import excursion2 from "@/assets/EXCURSION2.jpeg";
import excursion3 from "@/assets/EXCURSION3.jpeg";
import jhs from "@/assets/Jhs.jpeg";
import cultural from "@/assets/Cultural.jpeg";
import kindergarten from "@/assets/KG.jpeg";
import library from "@/assets/LIBRARY.jpeg";
import ict from "@/assets/ICT-LAB.jpg";
import campus from "@/assets/Campus1.jpeg";
import campus2 from "@/assets/campus2.jpeg";
import campus3 from "@/assets/campus3.jpeg";
import creche from "@/assets/Creche.jpeg";
import primary from "@/assets/Primary.jpeg";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery | Adonai International School Photos" },
      {
        name: "description",
        content:
          "Browse photos and videos of graduation, sports, science, cultural day, classrooms and campus life at Adonai International School.",
      },
      {
        property: "og:title",
        content: "Gallery — Adonai International School",
      },
      {
        property: "og:description",
        content: "Life at Adonai in pictures and video.",
      },
      { property: "og:url", content: "/gallery" },
    ],
    links: [{ rel: "canonical", href: "/gallery" }],
  }),
  component: Gallery,
});

type Item = {
  id: string;
  src: string;
  alt: string;
  cat: string;
  mediaType: string;
};

const fallback: Item[] = [
  {
    id: "graduation",
    src: graduation,
    alt: "Graduation ceremony",
    cat: "Graduation",
    mediaType: "image",
  },
  {
    id: "sports",
    src: sports,
    alt: "Inter-house sports",
    cat: "Sports",
    mediaType: "image",
  },
  {
    id: "excursion-1",
    src: excursion,
    alt: "School excursion",
    cat: "Excursions",
    mediaType: "image",
  },
  {
    id: "excursion-2",
    src: excursion2,
    alt: "School excursion",
    cat: "Excursions",
    mediaType: "image",
  },
  {
    id: "excursion-3",
    src: excursion3,
    alt: "School excursion",
    cat: "Excursions",
    mediaType: "image",
  },
  {
    id: "jhs",
    src: jhs,
    alt: "Junior High School class",
    cat: "Classroom",
    mediaType: "image",
  },
  {
    id: "cultural",
    src: cultural,
    alt: "Cultural day performance",
    cat: "Cultural",
    mediaType: "image",
  },
  {
    id: "kindergarten",
    src: kindergarten,
    alt: "Kindergarten storytime",
    cat: "Classroom",
    mediaType: "image",
  },
  {
    id: "creche",
    src: creche,
    alt: "Creche classroom",
    cat: "Classroom",
    mediaType: "image",
  },
  {
    id: "primary",
    src: primary,
    alt: "Primary school classroom",
    cat: "Classroom",
    mediaType: "image",
  },
  {
    id: "library",
    src: library,
    alt: "Library reading hour",
    cat: "Facilities",
    mediaType: "image",
  },
  {
    id: "campus",
    src: campus,
    alt: "School campus",
    cat: "Facilities",
    mediaType: "image",
  },
  {
    id: "campus-2",
    src: campus2,
    alt: "School campus",
    cat: "Facilities",
    mediaType: "image",
  },
  {
    id: "campus-3",
    src: campus3,
    alt: "School campus",
    cat: "Facilities",
    mediaType: "image",
  },
  {
    id: "ict",
    src: ict,
    alt: "ICT lab session",
    cat: "Classroom",
    mediaType: "image",
  },
];

function Gallery() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [active, setActive] = useState("All");
  const [open, setOpen] = useState<Item | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("gallery_items")
          .select("id,media_url,media_type,caption,category")
          .eq("published", true)
          .order("sort_order")
          .order("created_at", { ascending: false });
        if (error) throw error;
        const mapped: Item[] = (data ?? []).map((row) => ({
          id: row.id,
          src: row.media_url,
          alt: row.caption,
          cat: row.category,
          mediaType: row.media_type,
        }));
        setItems(mapped.length > 0 ? mapped : fallback);
      } catch (loadError) {
        console.error("Failed to load gallery items:", loadError);
        setItems(fallback);
      }
    })();
  }, []);

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(new Set((items ?? fallback).map((item) => item.cat))),
    ],
    [items],
  );
  const list = useMemo(() => {
    const source = items ?? [];
    return active === "All"
      ? source
      : source.filter((item) => item.cat === active);
  }, [items, active]);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Gallery"
        title="Moments that make Adonai."
        subtitle="Filter by category to explore life across our campus."
      />
      <section className="section-pad">
        <div className="container-x">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActive(category)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${active === category ? "bg-primary text-primary-foreground shadow" : "border border-border bg-card hover:border-primary hover:text-primary"}`}
              >
                {category}
              </button>
            ))}
          </div>
          {items === null ? (
            <p className="mt-10 text-sm text-muted-foreground">
              Loading photos and videos…
            </p>
          ) : list.length === 0 ? (
            <p className="mt-10 text-sm text-muted-foreground">
              No media in this category yet.
            </p>
          ) : (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setOpen(item)}
                  className="group relative overflow-hidden rounded-2xl text-left"
                >
                  <Media item={item} />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent opacity-0 transition group-hover:opacity-100" />
                  <div className="pointer-events-none absolute bottom-3 left-4 text-white opacity-0 transition group-hover:opacity-100">
                    <div className="text-xs uppercase tracking-wider text-gold">
                      {item.cat}
                    </div>
                    <div className="text-sm font-semibold">{item.alt}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={open.alt}
          className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4"
          onClick={() => setOpen(null)}
        >
          <button
            aria-label="Close"
            className="absolute right-5 top-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X />
          </button>
          <div
            className="max-h-[85vh] max-w-[92vw]"
            onClick={(event) => event.stopPropagation()}
          >
            {isVideoMedia(open.mediaType) ? (
              <video
                src={open.src}
                controls
                autoPlay
                className="max-h-[85vh] max-w-[92vw] rounded-2xl shadow-2xl"
              />
            ) : (
              <img
                src={open.src}
                alt={open.alt}
                className="max-h-[85vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
              />
            )}
          </div>
        </div>
      )}
    </SiteLayout>
  );
}

function Media({ item }: { item: Item }) {
  return (
    <div className="relative aspect-[4/3] bg-secondary">
      {isVideoMedia(item.mediaType) ? (
        <>
          <video
            src={item.src}
            preload="metadata"
            className="h-full w-full object-cover"
          />
          <div className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white">
            <Play className="h-4 w-4" />
          </div>
        </>
      ) : (
        <img
          src={item.src}
          alt={item.alt}
          loading="lazy"
          width={1200}
          height={800}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
        />
      )}
    </div>
  );
}
