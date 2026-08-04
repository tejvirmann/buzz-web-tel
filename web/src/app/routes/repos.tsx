import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/repos")({
  component: lazyRouteComponent(
    () => import("@/features/repos/ui/ReposPage"),
    "AuthenticatedReposPage",
  ),
});
