import { createFileRoute, Outlet } from "@tanstack/react-router";

// The /admin layout itself decides whether to show the sign-in form or the
// dashboard, so this pathless layout no longer redirects unauthenticated users.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: () => <Outlet />,
});
