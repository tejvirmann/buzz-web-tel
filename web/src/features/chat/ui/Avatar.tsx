import { Bot } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { UserProfile } from "@/features/chat/lib/chat-types";
import { authenticatedMediaObjectUrl } from "@/shared/api/media-client";

const AVATAR_COLORS = ["#8c6bb1", "#2f7d68", "#b95f65", "#3977a8", "#8a7127", "#695ca8"];

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return [...words[0]].slice(0, 2).join("").toUpperCase();
  const lastWord = words[words.length - 1] ?? "";
  return `${[...words[0]][0] ?? ""}${[...lastWord][0] ?? ""}`.toUpperCase();
}

function avatarColor(pubkey: string): string {
  const index = Number.parseInt(pubkey.slice(0, 4), 16) % AVATAR_COLORS.length;
  return AVATAR_COLORS[Number.isNaN(index) ? 0 : index];
}

export function Avatar({
  profile,
  relayUrl,
  size = 36,
  showStatus,
  status,
}: {
  profile: UserProfile;
  relayUrl: string;
  size?: number;
  showStatus?: boolean;
  status?: "online" | "away" | "offline";
}) {
  const [resolvedPicture, setResolvedPicture] = useState<string | null>(null);
  const [pictureFailed, setPictureFailed] = useState(false);
  const picture = profile.picture;

  useEffect(() => {
    let cancelled = false;
    setPictureFailed(false);
    setResolvedPicture(null);
    if (!picture) return;
    void authenticatedMediaObjectUrl(picture, relayUrl)
      .then((url) => {
        if (!cancelled) setResolvedPicture(url);
      })
      .catch(() => {
        if (!cancelled) setPictureFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [picture, relayUrl]);

  const label = useMemo(() => initials(profile.name), [profile.name]);
  const statusColor = status === "online" ? "#35a56b" : status === "away" ? "#d7952e" : "#929292";

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-visible"
      style={{ width: size, height: size }}
      title={profile.name}
    >
      <span
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white"
        style={{ backgroundColor: avatarColor(profile.pubkey) }}
      >
        {resolvedPicture && !pictureFailed ? (
          <img
            alt=""
            className="h-full w-full object-cover"
            src={resolvedPicture}
            onError={() => setPictureFailed(true)}
          />
        ) : profile.isAgent && !picture ? (
          <Bot aria-hidden="true" style={{ width: size * 0.48, height: size * 0.48 }} />
        ) : (
          label
        )}
      </span>
      {showStatus ? (
        <span
          aria-label={status ?? "offline"}
          className="absolute bottom-0 right-0 rounded-full border-2 border-[var(--buzz-content-solid)]"
          role="img"
          style={{
            width: Math.max(9, size * 0.28),
            height: Math.max(9, size * 0.28),
            background: statusColor,
          }}
        />
      ) : null}
    </span>
  );
}
