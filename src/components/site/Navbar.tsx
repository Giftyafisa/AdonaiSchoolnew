import { Link, useMatchRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Phone } from "lucide-react";
import logo from "@/assets/Adonai-logo-crest.jpg";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/academics", label: "Academics" },
  { to: "/admissions", label: "Admissions" },
  { to: "/gallery", label: "Gallery" },
  { to: "/news", label: "News" },
  { to: "/contact", label: "Contact" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const matchRoute = useMatchRoute();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all ${
        scrolled
          ? "glass shadow-[var(--shadow-soft)]"
          : "bg-gradient-to-b from-primary/90 via-primary/70 to-transparent"
      }`}
    >
      <div className="container-x flex h-20 items-center justify-between gap-4">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-3"
          aria-label="Adonai International School — Home"
        >
          <img
            src={logo}
            alt="Adonai International School logo"
            className="h-12 w-12 shrink-0 rounded-md object-cover"
            width={48}
            height={48}
          />
          <div className="min-w-0 leading-tight">
            <div
              className={`truncate font-display text-base font-bold sm:text-lg ${scrolled ? "text-primary" : "text-white"}`}
            >
              Adonai International School
            </div>
            <div
              className={`truncate text-[11px] uppercase tracking-[0.18em] ${scrolled ? "text-muted-foreground" : "text-white/80"}`}
            >
              Discipline · Hard Work
            </div>
          </div>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {links.map((l) => {
            const active = Boolean(
              matchRoute({ to: l.to, fuzzy: l.to !== "/" }),
            );
            return (
              <Link
                key={l.to}
                to={l.to}
                className={[
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? scrolled
                      ? "bg-primary text-primary-foreground"
                      : "bg-white text-primary shadow-sm"
                    : scrolled
                      ? "text-foreground/80 hover:bg-secondary hover:text-primary"
                      : "text-white/90 hover:bg-white/15 hover:text-white",
                ].join(" ")}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="tel:+233240218814"
            className={[
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
              scrolled
                ? "border-border bg-background/60 text-foreground hover:border-primary hover:text-primary"
                : "border-white/50 bg-white/10 text-white hover:border-white hover:bg-white/20",
            ].join(" ")}
          >
            <Phone className="h-4 w-4" /> +233 24 021 8814
          </a>
          <Link
            to="/admissions"
            className={[
              "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold shadow-[var(--shadow-elegant)] transition",
              scrolled
                ? "bg-primary text-primary-foreground hover:bg-primary-glow"
                : "bg-gold text-gold-foreground hover:brightness-105",
            ].join(" ")}
          >
            Apply Now
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className={[
            "inline-flex h-11 w-11 items-center justify-center rounded-md transition",
            scrolled
              ? "text-foreground hover:bg-secondary"
              : "text-white hover:bg-white/15",
          ].join(" ")}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden">
          <div className="container-x pb-6">
            <nav
              aria-label="Mobile"
              className="glass flex flex-col gap-1 rounded-2xl p-3"
            >
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-4 py-3 text-base font-medium text-foreground/90 hover:bg-secondary hover:text-primary"
                  activeProps={{ className: "text-primary bg-secondary" }}
                  activeOptions={{ exact: l.to === "/" }}
                >
                  {l.label}
                </Link>
              ))}
              <Link
                to="/admissions"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
              >
                Apply Now
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
