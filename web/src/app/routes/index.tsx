import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: lazyRouteComponent(() => import("@/features/chat/ui/BuzzWebApp"), "BuzzWebApp"),
});
