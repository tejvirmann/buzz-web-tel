import { AlertTriangle, Hash, LoaderCircle, Lock, Menu, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import buzzAppIcon from "@/assets/app-icon@3x.png";
import { AgentsView } from "@/features/agents/ui/AgentsView";
import { useRelayAgents } from "@/features/agents/use-relay-agents";
import { channelDisplayName } from "@/features/chat/lib/chat-model";
import { useBuzzSession } from "@/features/chat/lib/use-buzz-session";
import {
  CreateChannelDialog,
  NewDmDialog,
  SearchDialog,
  SettingsDialog,
} from "@/features/chat/ui/AppDialogs";
import { AppNavigation } from "@/features/chat/ui/AppNavigation";
import { ChannelHeaderActions } from "@/features/chat/ui/ChannelHeaderActions";
import { IdentityGate } from "@/features/chat/ui/IdentityGate";
import { useLeftPanelWidth } from "@/features/chat/ui/LeftPanelSizing";
import { MemberPanel } from "@/features/chat/ui/MemberPanel";
import { MessageComposer } from "@/features/chat/ui/MessageComposer";
import { MessageList } from "@/features/chat/ui/MessageList";
import { useRightPanelWidth } from "@/features/chat/ui/RightPanelSizing";
import { ThreadPanel } from "@/features/chat/ui/ThreadPanel";
import { type WorkspaceTool, WorkspaceToolPanel } from "@/features/chat/ui/WorkspaceToolPanel";
import { addCommunityMember, mintCommunityInvite } from "@/features/community/invite-api";
import { CommunityInviteDialog } from "@/features/community/ui/CommunityInviteDialog";
import type { InboxItem } from "@/features/inbox/lib/inbox-model";
import { InboxView } from "@/features/inbox/ui/InboxView";
import { useInbox } from "@/features/inbox/use-inbox";
import { ReposPanel } from "@/features/repos/ui/ReposPanel";
import { clearMediaObjectUrls } from "@/shared/api/media-client";
import { BuzzRelayClient } from "@/shared/api/relay-client";
import { loadRuntimeConfig, type RuntimeConfig } from "@/shared/config/runtime-config";
import { resolveRelayFeatures } from "@/shared/features/relay-features";
import { t } from "@/shared/i18n";

type DialogName = "create" | "dm" | "search" | "settings" | "invite" | null;

function Workspace({
  config,
  pubkey,
  demo,
  signOut,
}: {
  config: RuntimeConfig;
  pubkey: string;
  demo: boolean;
  signOut: () => void;
}) {
  const client = useMemo(
    () => (demo ? null : new BuzzRelayClient(config.relayUrl)),
    [config.relayUrl, demo],
  );
  const session = useBuzzSession({ client, config, pubkey, demo });
  const { state, selectedChannel } = session;
  const [activeTool, setActiveTool] = useState<WorkspaceTool | null>(null);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [threadRootId, setThreadRootId] = useState<string | null>(null);
  const [memberPanelOpen, setMemberPanelOpen] = useState(false);
  const [insertMention, setInsertMention] = useState<string | null>(null);
  const [relayHasProjects, setRelayHasProjects] = useState(false);
  const {
    maximum: maximumNavigationWidth,
    panelWidth: navigationWidth,
    setPanelWidth: setNavigationWidth,
  } = useLeftPanelWidth();
  const {
    maximum: maximumMemberWidth,
    minimum: minimumMemberWidth,
    panelWidth: memberPanelWidth,
    setPanelWidth: setMemberPanelWidth,
  } = useRightPanelWidth("member");
  const {
    maximum: maximumThreadWidth,
    minimum: minimumThreadWidth,
    panelWidth: threadPanelWidth,
    setPanelWidth: setThreadPanelWidth,
  } = useRightPanelWidth("thread");
  const relayAgents = useRelayAgents({
    client,
    demo,
    agentControlUrl: config.agentControlUrl,
    configuredAgents: config.agents,
    channels: state.channels,
    profiles: state.profiles,
    presence: state.presence,
    ensureProfiles: session.ensureProfiles,
    refreshChannels: session.refreshChannels,
  });
  const inbox = useInbox({
    client,
    demo,
    relayUrl: config.relayUrl,
    currentPubkey: pubkey,
    configuredAgents: config.agents,
    channels: state.channels,
    ensureProfiles: session.ensureProfiles,
  });
  const channelUnreadCounts = useMemo(
    () =>
      inbox.items.reduce<Record<string, number>>((counts, item) => {
        if (item.unread && item.channelId) {
          counts[item.channelId] = (counts[item.channelId] ?? 0) + 1;
        }
        return counts;
      }, {}),
    [inbox.items],
  );
  const threadRoot = state.messages.find((message) => message.event.id === threadRootId) ?? null;
  const canCreateChannel = state.communityRole === "owner" || state.communityRole === "admin";
  const connected = state.connectionState === "connected";
  const features = resolveRelayFeatures(config.features, {
    projects: relayHasProjects,
    forum: state.channels.some((channel) => channel.type === "forum"),
  });

  useEffect(() => {
    if (!client || demo || config.features.projects || !connected) return;
    let cancelled = false;
    void client
      .query({ kinds: [30617], limit: 1 })
      .then((events) => {
        if (!cancelled) setRelayHasProjects(events.length > 0);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [client, config.features.projects, connected, demo]);

  const handleSignOut = () => {
    client?.disconnect();
    clearMediaObjectUrls();
    signOut();
  };
  const selectChannel = (channelId: string) => {
    inbox.markChannelRead(channelId);
    setActiveTool(null);
    setThreadRootId(null);
    setMemberPanelOpen(false);
    session.selectChannel(channelId);
  };
  const toggleTool = (tool: WorkspaceTool) => {
    if (activeTool === tool && state.selectedChannelId) {
      inbox.markChannelRead(state.selectedChannelId);
    }
    setActiveTool((current) => (current === tool ? null : tool));
    setThreadRootId(null);
    setMemberPanelOpen(false);
    setMobileNavigationOpen(false);
  };
  const showMessages = () => {
    if (state.selectedChannelId) inbox.markChannelRead(state.selectedChannelId);
    setActiveTool(null);
    setMobileNavigationOpen(false);
  };
  const openInboxConversation = (item: InboxItem) => {
    if (!item.channelId) return;
    inbox.markChannelRead(item.channelId);
    setActiveTool(null);
    setMobileNavigationOpen(false);
    setMemberPanelOpen(false);
    session.selectChannel(item.channelId);
    setThreadRootId(item.threadRootId);
  };
  const openAgentDm = async (targetPubkey: string) => {
    try {
      await session.openDm(targetPubkey);
      setActiveTool(null);
      setThreadRootId(null);
      setMemberPanelOpen(false);
    } catch (openError) {
      toast.error(openError instanceof Error ? openError.message : t("error.dmOpen"));
    }
  };
  const toggleMemberPanel = () => {
    setActiveTool(null);
    if (threadRootId) {
      setThreadRootId(null);
      setMemberPanelOpen(true);
      return;
    }
    setMemberPanelOpen((open) => !open);
  };

  const displayName = selectedChannel
    ? channelDisplayName(selectedChannel, state.profiles, pubkey)
    : "Buzz";
  const typingNames = state.typingPubkeys
    .map((typingPubkey) => state.profiles[typingPubkey]?.name)
    .filter((name): name is string => Boolean(name));

  return (
    <div className="buzz-app-surface flex h-dvh min-h-0 w-full overflow-hidden pb-14 md:p-2 md:pb-2">
      <AppNavigation
        activeTool={activeTool}
        canCreateChannel={canCreateChannel}
        canManageMembers={canCreateChannel}
        channels={state.channels}
        communityName={config.communityName}
        connectionState={state.connectionState}
        currentPubkey={pubkey}
        channelUnreadCounts={channelUnreadCounts}
        inboxUnreadCount={inbox.unreadCount}
        features={features}
        mobileOpen={mobileNavigationOpen}
        maximumWidth={maximumNavigationWidth}
        panelWidth={navigationWidth}
        profiles={state.profiles}
        presence={state.presence}
        relayUrl={config.relayUrl}
        selectedChannelId={state.selectedChannelId}
        onCloseMobile={() => setMobileNavigationOpen(false)}
        onCreateChannel={() => setDialog("create")}
        onInvite={() => setDialog("invite")}
        onNewDm={() => setDialog("dm")}
        onShowMessages={showMessages}
        onToggleTool={toggleTool}
        onSearch={() => setDialog("search")}
        onSelectChannel={selectChannel}
        onSettings={() => setDialog("settings")}
        onResize={setNavigationWidth}
      />

      <section className="buzz-content-surface relative flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border">
        {!activeTool ? (
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <header className="flex h-[60px] shrink-0 items-center gap-2 border-b px-3 sm:px-4">
              <button
                aria-label={t("workspace.openChannels")}
                className="buzz-icon-button md:!hidden"
                title={t("common.channel")}
                type="button"
                onClick={() => setMobileNavigationOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {selectedChannel?.type === "dm" ? (
                  <Users className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                ) : (
                  <Hash className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                )}
                <h1 className="truncate text-[15px] font-semibold">{displayName}</h1>
                {selectedChannel?.visibility === "private" ? (
                  <Lock
                    className="h-3 w-3 shrink-0 text-muted-foreground"
                    aria-label={t("common.private")}
                  />
                ) : null}
              </div>
              {selectedChannel ? (
                <ChannelHeaderActions
                  loading={state.loadingChannels}
                  memberCount={selectedChannel.members.length}
                  membersVisible={!threadRoot && memberPanelOpen}
                  onRefresh={() => void session.refreshChannels()}
                  onSearch={() => setDialog("search")}
                  onSettings={() => setDialog("settings")}
                  onToggleMembers={toggleMemberPanel}
                />
              ) : null}
            </header>

            {state.error ? (
              <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/8 px-4 py-2 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{state.error}</span>
                {state.error.toLowerCase().includes("member") || state.error.includes("成员") ? (
                  <button
                    className="shrink-0 font-medium underline"
                    type="button"
                    onClick={handleSignOut}
                  >
                    {t("workspace.changeIdentity")}
                  </button>
                ) : null}
              </div>
            ) : null}

            {selectedChannel ? (
              <>
                <MessageList
                  currentPubkey={pubkey}
                  loading={state.loadingMessages}
                  messages={state.messages}
                  presence={state.presence}
                  profiles={state.profiles}
                  relayUrl={config.relayUrl}
                  onOpenThread={(message) => {
                    setActiveTool(null);
                    setMemberPanelOpen(false);
                    setThreadRootId(message.event.id);
                  }}
                  onReact={session.addReaction}
                />
                {typingNames.length ? (
                  <div className="h-6 shrink-0 px-5 text-[11px] text-muted-foreground">
                    {t("workspace.typing", { names: typingNames.slice(0, 3).join(", ") })}
                  </div>
                ) : null}
                <MessageComposer
                  disabled={!connected}
                  insertMention={insertMention}
                  members={selectedChannel.members}
                  placeholder={t("workspace.sendTo", {
                    target: selectedChannel.type === "dm" ? displayName : `#${displayName}`,
                  })}
                  profiles={state.profiles}
                  relayUrl={config.relayUrl}
                  onMentionInserted={() => setInsertMention(null)}
                  onSend={(content, attachments) => session.sendMessage(content, attachments)}
                  onTyping={() => session.notifyTyping()}
                />
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                {state.loadingChannels ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    {t("workspace.loadingChannels")}
                  </>
                ) : (
                  t("workspace.noChannels")
                )}
              </div>
            )}
          </main>
        ) : null}

        {activeTool ? (
          <WorkspaceToolPanel tool={activeTool}>
            {activeTool === "agents" ? (
              <AgentsView
                agents={relayAgents.agents}
                channels={state.channels}
                error={relayAgents.error}
                loading={relayAgents.loading}
                pendingAction={relayAgents.pendingAction}
                startingPubkey={relayAgents.startingPubkey}
                profiles={state.profiles}
                relayUrl={config.relayUrl}
                onClose={() => setActiveTool(null)}
                onOpenDm={openAgentDm}
                onRefresh={() => void relayAgents.refresh()}
                onSetChannel={relayAgents.setAgentChannel}
                onStartAgent={relayAgents.startAgent}
              />
            ) : activeTool === "inbox" ? (
              <InboxView
                approvalPending={inbox.approvalPending}
                channels={state.channels}
                error={inbox.error}
                items={inbox.items}
                loading={inbox.loading}
                profiles={state.profiles}
                relayUrl={config.relayUrl}
                onClose={() => setActiveTool(null)}
                onMarkAllRead={inbox.markAllRead}
                onMarkRead={inbox.markRead}
                onMarkUnread={inbox.markUnread}
                onOpenConversation={openInboxConversation}
                onRefresh={() => void inbox.refresh()}
                onRespondToApproval={(item, approved) =>
                  inbox.respondToApproval(item.event, approved)
                }
              />
            ) : (
              <ReposPanel
                demo={demo}
                profiles={state.profiles}
                relayUrl={config.relayUrl}
                onClose={() => setActiveTool(null)}
                onOpenChannel={selectChannel}
              />
            )}
          </WorkspaceToolPanel>
        ) : threadRoot ? (
          <ThreadPanel
            key={threadRoot.event.id}
            disabled={!connected}
            maximumWidth={maximumThreadWidth}
            messages={state.messages}
            members={selectedChannel?.members ?? []}
            minimumWidth={minimumThreadWidth}
            panelWidth={threadPanelWidth}
            presence={state.presence}
            profiles={state.profiles}
            relayUrl={config.relayUrl}
            root={threadRoot}
            onClose={() => setThreadRootId(null)}
            onReact={session.addReaction}
            onResize={setThreadPanelWidth}
            onSend={(content, attachments, replyTarget) =>
              session.sendMessage(content, attachments, {
                id: replyTarget.event.id,
                rootId: threadRoot.event.id,
                authorPubkey: replyTarget.event.pubkey,
              })
            }
            onTyping={(replyTarget) =>
              session.notifyTyping({
                id: replyTarget.event.id,
                rootId: threadRoot.event.id,
                authorPubkey: replyTarget.event.pubkey,
              })
            }
          />
        ) : selectedChannel && memberPanelOpen ? (
          <MemberPanel
            channel={selectedChannel}
            currentPubkey={pubkey}
            maximumWidth={maximumMemberWidth}
            minimumWidth={minimumMemberWidth}
            panelWidth={memberPanelWidth}
            presence={state.presence}
            profiles={state.profiles}
            relayUrl={config.relayUrl}
            onClose={() => setMemberPanelOpen(false)}
            onMention={setInsertMention}
            onOpenDm={async (target) => {
              await session.openDm(target);
              setMemberPanelOpen(false);
            }}
            onResize={setMemberPanelWidth}
          />
        ) : null}
      </section>

      {dialog === "create" ? (
        <CreateChannelDialog
          allowForum={features.forum}
          onClose={() => setDialog(null)}
          onCreate={session.createChannel}
        />
      ) : null}
      {dialog === "dm" ? (
        <NewDmDialog
          currentPubkey={pubkey}
          profiles={state.profiles}
          relayUrl={config.relayUrl}
          onClose={() => setDialog(null)}
          onOpen={session.openDm}
        />
      ) : null}
      {dialog === "search" ? (
        <SearchDialog
          channels={state.channels}
          profiles={state.profiles}
          onClose={() => setDialog(null)}
          onSearch={session.search}
          onSelect={(hit) => selectChannel(hit.channelId)}
        />
      ) : null}
      {dialog === "settings" ? (
        <SettingsDialog
          connectionState={state.connectionState}
          pubkey={pubkey}
          relayUrl={config.relayUrl}
          onClose={() => setDialog(null)}
          onSignOut={handleSignOut}
        />
      ) : null}
      {dialog === "invite" ? (
        <CommunityInviteDialog
          onClose={() => setDialog(null)}
          onAddMember={async (targetPubkey, role) => {
            if (demo) return;
            if (!client) throw new Error(t("error.relayClient"));
            await addCommunityMember(client, targetPubkey, role);
            await session.ensureProfiles([targetPubkey]);
          }}
          onMintInvite={async (options) => {
            if (demo) {
              return {
                code: "demo-code",
                expiresAt: Math.floor(Date.now() / 1_000) + options.ttlSecs,
                url: new URL(
                  `${import.meta.env.BASE_URL}invite/demo-code`,
                  window.location.origin,
                ).toString(),
                maxUses: options.maxUses,
                usesRemaining: options.maxUses,
              };
            }
            return mintCommunityInvite(config.relayUrl, options);
          }}
        />
      ) : null}
    </div>
  );
}

export function BuzzWebApp() {
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void loadRuntimeConfig()
      .then(setConfig)
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : t("error.configLoad")),
      );
  }, []);

  if (!config) {
    return (
      <div className="buzz-app-surface flex min-h-dvh items-center justify-center">
        <div className="text-center">
          <img alt="Buzz" className="mx-auto h-12 w-12 rounded-xl" src={buzzAppIcon} />
          {error ? (
            <p className="mt-4 text-sm text-destructive">{error}</p>
          ) : (
            <LoaderCircle className="mx-auto mt-4 h-5 w-5 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>
    );
  }
  return (
    <IdentityGate config={config}>
      {({ pubkey, signOut, demo }) => (
        <Workspace config={config} demo={demo} pubkey={pubkey} signOut={signOut} />
      )}
    </IdentityGate>
  );
}
