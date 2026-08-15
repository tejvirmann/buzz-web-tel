import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/claim")({
  component: lazyRouteComponent(
    () => import("@/features/invite/ui/ClaimPageRoute"),
    "ClaimPageRoute",
  ),
});
