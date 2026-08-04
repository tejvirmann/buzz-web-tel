import { useParams } from "@tanstack/react-router";
import { InvitePage } from "@/features/invite/ui/InvitePage";

export function InvitePageRoute() {
  const { code } = useParams({ from: "/invite/$code" });
  return <InvitePage code={code} />;
}
