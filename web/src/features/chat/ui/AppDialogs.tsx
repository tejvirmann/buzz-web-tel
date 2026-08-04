import { Compass, Hash, LoaderCircle, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { BuzzChannel, SearchHit, UserProfile } from "@/features/chat/lib/chat-types";
import { Avatar } from "@/features/chat/ui/Avatar";
import { t } from "@/shared/i18n";
import { truncatePubkey } from "@/shared/lib/pubkey";

export function DialogFrame({
  title,
  children,
  onClose,
  width = "max-w-lg",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: string;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      role="presentation"
    >
      <section
        aria-label={title}
        aria-modal="true"
        className={`max-h-[85dvh] w-full ${width} overflow-hidden rounded-lg border bg-popover shadow-2xl`}
        role="dialog"
      >
        <header className="flex h-13 items-center justify-between border-b px-4">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            aria-label={t("common.close")}
            className="buzz-icon-button"
            title={t("common.close")}
            type="button"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export type CreateChannelInput = {
  name: string;
  description: string;
  type: "stream" | "forum";
  visibility: "open" | "private";
};

export function CreateChannelForm({
  allowForum,
  onCancel,
  onCreate,
}: {
  allowForum: boolean;
  onCancel: () => void;
  onCreate: (input: CreateChannelInput) => Promise<unknown>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"stream" | "forum">("stream");
  const [visibility, setVisibility] = useState<"open" | "private">("open");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-4 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) return;
        setSubmitting(true);
        setError(null);
        void onCreate({ name, description, type, visibility })
          .catch((createError) =>
            setError(createError instanceof Error ? createError.message : t("error.channelCreate")),
          )
          .finally(() => setSubmitting(false));
      }}
    >
      <label className="block text-xs font-medium">
        {t("dialog.channelName")}
        <input
          className="mt-1.5 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          maxLength={80}
          placeholder={t("dialog.channelExample")}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="block text-xs font-medium">
        {t("dialog.channelSummary")}
        <textarea
          className="mt-1.5 min-h-20 w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          maxLength={500}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-medium">
          {t("dialog.channelType")}
          <select
            className="mt-1.5 h-9 w-full rounded-md border bg-background px-2 text-sm"
            value={type}
            onChange={(event) => setType(event.target.value as "stream" | "forum")}
          >
            <option value="stream">{t("dialog.channelTypeStream")}</option>
            {allowForum ? <option value="forum">{t("dialog.channelTypeForum")}</option> : null}
          </select>
        </label>
        <label className="block text-xs font-medium">
          {t("dialog.channelVisibility")}
          <select
            className="mt-1.5 h-9 w-full rounded-md border bg-background px-2 text-sm"
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as "open" | "private")}
          >
            <option value="open">{t("dialog.visibilityOpen")}</option>
            <option value="private">{t("dialog.visibilityPrivate")}</option>
          </select>
        </label>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex justify-end gap-2 border-t pt-4">
        <button
          className="h-9 rounded-md px-3 text-sm hover:bg-foreground/5"
          type="button"
          onClick={onCancel}
        >
          {t("common.cancel")}
        </button>
        <button
          className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
          disabled={!name.trim() || submitting}
          type="submit"
        >
          {submitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t("common.create")}
        </button>
      </div>
    </form>
  );
}

export function NewDmDialog({
  profiles,
  currentPubkey,
  relayUrl,
  onClose,
  onOpen,
}: {
  profiles: Record<string, UserProfile>;
  currentPubkey: string;
  relayUrl: string;
  onClose: () => void;
  onOpen: (pubkey: string) => Promise<unknown>;
}) {
  const [query, setQuery] = useState("");
  const [opening, setOpening] = useState<string | null>(null);
  const options = useMemo(
    () =>
      Object.values(profiles)
        .filter((profile) => profile.pubkey !== currentPubkey)
        .filter((profile) => profile.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
        .sort(
          (left, right) =>
            Number(right.isAgent) - Number(left.isAgent) || left.name.localeCompare(right.name),
        ),
    [currentPubkey, profiles, query],
  );
  return (
    <DialogFrame title={t("dialog.newDm")} onClose={onClose}>
      <div className="border-b p-3">
        <div className="flex h-9 items-center gap-2 rounded-md border bg-background px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            placeholder={t("dialog.searchMembers")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      <div className="buzz-scrollbar max-h-96 overflow-y-auto p-2">
        {options.map((profile) => (
          <button
            key={profile.pubkey}
            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-foreground/5"
            disabled={opening !== null}
            type="button"
            onClick={() => {
              setOpening(profile.pubkey);
              void onOpen(profile.pubkey)
                .then(onClose)
                .finally(() => setOpening(null));
            }}
          >
            <Avatar profile={profile} relayUrl={relayUrl} size={34} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{profile.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {profile.isAgent ? t("member.remoteAgent") : profile.about}
              </div>
            </div>
            {opening === profile.pubkey ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          </button>
        ))}
      </div>
    </DialogFrame>
  );
}

export function SearchDialog({
  channels,
  profiles,
  onClose,
  onSearch,
  onSelect,
  onSelectChannel,
  onBrowseChannels,
  onCreateChannel,
}: {
  channels: BuzzChannel[];
  profiles: Record<string, UserProfile>;
  onClose: () => void;
  onSearch: (term: string) => Promise<SearchHit[]>;
  onSelect: (hit: SearchHit) => void;
  onSelectChannel: (channelId: string) => void;
  onBrowseChannels: () => void;
  onCreateChannel?: () => void;
}) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (term.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setLoading(true);
      void onSearch(term)
        .then(setResults)
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [onSearch, term]);
  return (
    <DialogFrame title={t("dialog.searchMessages")} width="max-w-2xl" onClose={onClose}>
      <div className="flex h-12 items-center gap-2 border-b px-4">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          placeholder={t("dialog.searchRelay")}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
        {loading ? <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </div>
      <div className="buzz-scrollbar max-h-[60dvh] overflow-y-auto p-2">
        {term.trim().length < 2 ? (
          <div>
            <div className="flex items-center gap-2 px-2 pb-2">
              <button
                className="inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-xs font-medium hover:bg-foreground/6"
                type="button"
                onClick={() => {
                  onClose();
                  onBrowseChannels();
                }}
              >
                <Compass className="h-4 w-4 text-muted-foreground" />
                {t("channel.browserTitle")}
              </button>
              {onCreateChannel ? (
                <button
                  className="inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-xs font-medium hover:bg-foreground/6"
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreateChannel();
                  }}
                >
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  {t("dialog.createChannel")}
                </button>
              ) : null}
            </div>
            <div className="border-t pt-1">
              {channels
                .filter((channel) => channel.isMember && !channel.archived)
                .slice(0, 10)
                .map((channel) => (
                  <button
                    key={channel.id}
                    className="flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm hover:bg-foreground/5"
                    type="button"
                    onClick={() => {
                      onSelectChannel(channel.id);
                      onClose();
                    }}
                  >
                    <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{channel.name}</span>
                    {channel.description ? (
                      <span className="max-w-[45%] truncate text-xs text-muted-foreground">
                        {channel.description}
                      </span>
                    ) : null}
                  </button>
                ))}
            </div>
          </div>
        ) : null}
        {results.map((hit) => {
          const channel = channels.find((item) => item.id === hit.channelId);
          const profile = profiles[hit.event.pubkey.toLowerCase()];
          return (
            <button
              key={hit.event.id}
              className="w-full rounded-md px-3 py-2.5 text-left hover:bg-foreground/5"
              type="button"
              onClick={() => {
                onSelect(hit);
                onClose();
              }}
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Hash className="h-3 w-3" /> {channel?.name ?? t("common.channel")} ·{" "}
                {profile?.name ?? truncatePubkey(hit.event.pubkey)}
              </div>
              <p className="mt-1 line-clamp-2 text-sm leading-5">{hit.event.content}</p>
            </button>
          );
        })}
        {term.trim().length >= 2 && !loading && !results.length ? (
          <p className="px-3 py-10 text-center text-sm text-muted-foreground">
            {t("dialog.noMessages")}
          </p>
        ) : null}
      </div>
    </DialogFrame>
  );
}
