import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/invite/$code")({
  component: lazyRouteComponent(
    () => import("@/features/invite/ui/InvitePageRoute"),
    "InvitePageRoute",
  ),
});
