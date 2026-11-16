import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

// Legacy alias: the staff sign-in form now lives at /admin.
// Kept so old bookmarks/links still land in the admin portal.
export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff Sign In | Adonai International School" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthRedirect,
});

function AuthRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/admin", replace: true });
  }, [navigate]);
  return null;
}
