import { CornerUpLeft, LoaderCircle, Paperclip, Send, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { contentWithAttachments, fallbackProfile } from "@/features/chat/lib/chat-model";
import type {
  AttachmentDescriptor,
  ChannelMember,
  UserProfile,
} from "@/features/chat/lib/chat-types";
import {
  detectMentionQuery,
  insertMention as insertMentionAtQuery,
  type MentionQuery,
} from "@/features/chat/lib/composer-mentions";
import {
  clearConversationDraft,
  readConversationDraft,
  writeConversationDraft,
} from "@/features/chat/lib/conversation-drafts";
import {
  type ComposerMentionCandidate,
  MentionAutocomplete,
} from "@/features/chat/ui/MentionAutocomplete";
import { uploadAttachment } from "@/shared/api/media-client";
import { t } from "@/shared/i18n";

export function MessageComposer({
  relayUrl,
  placeholder,
  disabled,
  compact = false,
  draftKey,
  insertMention,
  members = [],
  profiles = {},
  replyTarget,
  onMentionInserted,
  onCancelReply,
  onTyping,
  onSend,
}: {
  relayUrl: string;
  placeholder: string;
  disabled?: boolean;
  compact?: boolean;
  draftKey?: string;
  insertMention?: string | null;
  members?: ChannelMember[];
  profiles?: Record<string, UserProfile>;
  replyTarget?: { id: string; author: string; body: string } | null;
  onMentionInserted?: () => void;
  onCancelReply?: () => void;
  onTyping: () => void;
  onSend: (content: string, attachments: AttachmentDescriptor[]) => Promise<void>;
}) {
  const initialDraft = useMemo(
    () => (draftKey ? readConversationDraft(draftKey) : { content: "", attachments: [] }),
    [draftKey],
  );
  const [content, setContent] = useState(initialDraft.content);
  const [attachments, setAttachments] = useState<AttachmentDescriptor[]>(initialDraft.attachments);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<MentionQuery | null>(null);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const latestDraft = useRef({
    content: initialDraft.content,
    attachments: initialDraft.attachments,
  });
  latestDraft.current = { content, attachments };
  const mentionListId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mentionCandidates = useMemo<ComposerMentionCandidate[]>(
    () =>
      members.map((member) => {
        const pubkey = member.pubkey.toLowerCase();
        return {
          pubkey,
          profile: profiles[pubkey] ?? fallbackProfile(pubkey),
          role: member.role,
        };
      }),
    [members, profiles],
  );
  const mentionMatches = useMemo(() => {
    if (!mentionQuery) return [];
    const query = mentionQuery.query.trim().toLocaleLowerCase();
    return mentionCandidates
      .filter((candidate) => candidate.profile.name.toLocaleLowerCase().includes(query))
      .sort((left, right) => {
        const leftStarts = left.profile.name.toLocaleLowerCase().startsWith(query);
        const rightStarts = right.profile.name.toLocaleLowerCase().startsWith(query);
        return Number(rightStarts) - Number(leftStarts);
      })
      .slice(0, 12);
  }, [mentionCandidates, mentionQuery]);

  useEffect(() => {
    if (!draftKey) return;
    const timer = window.setTimeout(
      () => writeConversationDraft(draftKey, { content, attachments }),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [attachments, content, draftKey]);

  useEffect(() => {
    if (!draftKey) return;
    return () => writeConversationDraft(draftKey, latestDraft.current);
  }, [draftKey]);

  const updateMentionQuery = (value: string, cursorPosition: number) => {
    const next = detectMentionQuery(
      value,
      cursorPosition,
      mentionCandidates.map((candidate) => candidate.profile.name),
    );
    setMentionQuery(next);
    setMentionSelectedIndex(0);
  };

  const selectMention = (candidate: ComposerMentionCandidate) => {
    if (!mentionQuery) return;
    const next = insertMentionAtQuery(content, mentionQuery, candidate.profile.name);
    setContent(next.value);
    setMentionQuery(null);
    setMentionSelectedIndex(0);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(next.cursorPosition, next.cursorPosition);
    });
  };

  useEffect(() => {
    if (!insertMention) return;
    setContent((current) => {
      const next = `${current}${current && !current.endsWith(" ") ? " " : ""}@${insertMention} `;
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(next.length, next.length);
      });
      return next;
    });
    setMentionQuery(null);
    onMentionInserted?.();
  }, [insertMention, onMentionInserted]);

  useEffect(() => {
    if (replyTarget) inputRef.current?.focus();
  }, [replyTarget]);

  const submit = async () => {
    if (disabled || sending || uploading || (!content.trim() && !attachments.length)) return;
    setSending(true);
    setError(null);
    try {
      await onSend(contentWithAttachments(content, attachments), attachments);
      latestDraft.current = { content: "", attachments: [] };
      if (draftKey) clearConversationDraft(draftKey);
      setContent("");
      setAttachments([]);
      setMentionQuery(null);
      inputRef.current?.focus();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : t("error.messageSend"));
    } finally {
      setSending(false);
    }
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: AttachmentDescriptor[] = [];
      for (const file of [...files].slice(0, 8))
        uploaded.push(await uploadAttachment(file, relayUrl));
      setAttachments((current) => [...current, ...uploaded]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t("error.attachmentUpload"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className={compact ? "px-3 pb-3" : "px-4 pb-4 sm:px-5"}>
      {attachments.length ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <span
              key={attachment.sha256}
              className="inline-flex max-w-56 items-center gap-1.5 rounded bg-foreground/7 px-2 py-1 text-xs"
            >
              <span className="truncate">{attachment.filename || t("message.attachment")}</span>
              <button
                aria-label={t("message.removeAttachment")}
                className="rounded p-0.5 hover:bg-foreground/10"
                type="button"
                onClick={() =>
                  setAttachments((current) =>
                    current.filter((item) => item.sha256 !== attachment.sha256),
                  )
                }
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="relative">
        {replyTarget ? (
          <div
            className="relative -mb-2 flex items-start gap-2 rounded-t-md border border-b-0 border-border/70 bg-muted/55 px-3 pb-4 pt-2 text-sm text-muted-foreground"
            data-testid="reply-target"
          >
            <CornerUpLeft aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">
                {t("message.replyingTo", { name: replyTarget.author })}
              </p>
              {replyTarget.body ? (
                <p className="truncate text-xs text-muted-foreground/80">{replyTarget.body}</p>
              ) : null}
            </div>
            <button
              aria-label={t("message.cancelReply")}
              className="buzz-icon-button -mr-1 h-7 w-7 shrink-0"
              type="button"
              onClick={onCancelReply}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <MentionAutocomplete
          candidates={mentionMatches}
          listId={mentionListId}
          relayUrl={relayUrl}
          selectedIndex={mentionSelectedIndex}
          onSelect={selectMention}
        />
        <div className="relative z-10 rounded-md border border-border/90 bg-background/90 shadow-sm focus-within:ring-2 focus-within:ring-primary/30">
          <textarea
            ref={inputRef}
            aria-label={placeholder}
            aria-activedescendant={
              mentionMatches.length
                ? `${mentionListId}-${mentionMatches[mentionSelectedIndex]?.pubkey}`
                : undefined
            }
            aria-controls={mentionMatches.length ? mentionListId : undefined}
            aria-expanded={mentionMatches.length > 0}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            className={`block w-full resize-none bg-transparent px-3 pt-3 text-[15px] leading-6 outline-none placeholder:text-muted-foreground ${compact ? "min-h-20" : "min-h-24"}`}
            disabled={disabled || sending}
            placeholder={placeholder}
            role="combobox"
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              updateMentionQuery(
                event.target.value,
                event.target.selectionStart ?? event.target.value.length,
              );
              onTyping();
            }}
            onSelect={(event) =>
              updateMentionQuery(event.currentTarget.value, event.currentTarget.selectionStart ?? 0)
            }
            onKeyDown={(event) => {
              if (mentionMatches.length && !event.nativeEvent.isComposing) {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  setMentionSelectedIndex((current) =>
                    event.key === "ArrowDown"
                      ? (current + 1) % mentionMatches.length
                      : (current - 1 + mentionMatches.length) % mentionMatches.length,
                  );
                  return;
                }
                if (event.key === "Enter" || event.key === "Tab") {
                  event.preventDefault();
                  const selected = mentionMatches[mentionSelectedIndex];
                  if (selected) selectMention(selected);
                  return;
                }
              }
              if (event.key === "Escape" && mentionQuery) {
                event.preventDefault();
                setMentionQuery(null);
                return;
              }
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void submit();
              }
            }}
          />
          <div className="flex h-10 items-center justify-between px-2">
            <div className="flex items-center">
              <input
                ref={fileRef}
                className="hidden"
                multiple
                type="file"
                onChange={(event) => void uploadFiles(event.target.files)}
              />
              <button
                aria-label={t("message.addAttachment")}
                className="buzz-icon-button"
                disabled={disabled || uploading || sending}
                title={t("message.addAttachment")}
                type="button"
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </button>
            </div>
            <button
              aria-label={t("message.send")}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity disabled:opacity-35"
              disabled={
                disabled || sending || uploading || (!content.trim() && !attachments.length)
              }
              title={t("message.send")}
              type="button"
              onClick={() => void submit()}
            >
              {sending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
