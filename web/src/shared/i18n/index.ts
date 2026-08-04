export type AppLocale = "en" | "zh-CN";

const messages = {
  "app.title": { en: "Buzz Web", "zh-CN": "Buzz Web" },
  "common.cancel": { en: "Cancel", "zh-CN": "取消" },
  "common.channel": { en: "Channel", "zh-CN": "频道" },
  "common.close": { en: "Close", "zh-CN": "关闭" },
  "common.create": { en: "Create", "zh-CN": "创建" },
  "common.messages": { en: "Messages", "zh-CN": "消息" },
  "common.refresh": { en: "Refresh", "zh-CN": "刷新" },
  "common.search": { en: "Search", "zh-CN": "搜索" },
  "common.settings": { en: "Settings", "zh-CN": "设置" },
  "dialog.appearance": { en: "Appearance", "zh-CN": "外观" },
  "dialog.channelExample": { en: "For example, engineering", "zh-CN": "例如 engineering" },
  "dialog.channelName": { en: "Name", "zh-CN": "名称" },
  "dialog.channelSummary": { en: "Description", "zh-CN": "简介" },
  "dialog.channelType": { en: "Type", "zh-CN": "类型" },
  "dialog.channelVisibility": { en: "Visibility", "zh-CN": "可见性" },
  "dialog.createChannel": { en: "Create channel", "zh-CN": "创建频道" },
  "dialog.dark": { en: "Dark", "zh-CN": "深色" },
  "dialog.light": { en: "Light", "zh-CN": "浅色" },
  "dialog.newDm": { en: "New direct message", "zh-CN": "发起私聊" },
  "dialog.noMessages": { en: "No messages found", "zh-CN": "没有找到消息" },
  "dialog.relaySession": { en: "Relay session", "zh-CN": "Relay 会话" },
  "dialog.searchMembers": { en: "Search members or agents", "zh-CN": "搜索成员或 Agent" },
  "dialog.searchMessages": { en: "Search messages", "zh-CN": "搜索消息" },
  "dialog.searchRelay": { en: "Search this Relay", "zh-CN": "搜索当前 Relay" },
  "dialog.signOut": { en: "Sign out", "zh-CN": "退出身份" },
  "dialog.systemTheme": { en: "System", "zh-CN": "跟随系统" },
  "field.address": { en: "Address", "zh-CN": "地址" },
  "field.publicKey": { en: "Public key", "zh-CN": "公钥" },
  "field.status": { en: "Status", "zh-CN": "状态" },
  "identity.checking": { en: "Checking identity", "zh-CN": "检查身份" },
  "identity.connectRelay": { en: "Connect to Relay", "zh-CN": "连接 Relay" },
  "identity.forget": { en: "Forget identity", "zh-CN": "忘记身份" },
  "identity.hideSecret": { en: "Hide private key", "zh-CN": "隐藏私钥" },
  "identity.newPassphrase": { en: "New vault passphrase", "zh-CN": "新保险库口令" },
  "identity.nip07": { en: "Use NIP-07 extension", "zh-CN": "使用 NIP-07 扩展" },
  "identity.or": { en: "or", "zh-CN": "或" },
  "identity.passphrase": { en: "Vault passphrase", "zh-CN": "保险库口令" },
  "identity.remember": { en: "Encrypt and save on this device", "zh-CN": "加密保存在此设备" },
  "identity.returnSaved": { en: "Return to saved identity", "zh-CN": "返回已保存身份" },
  "identity.saved": { en: "Saved identity", "zh-CN": "已保存身份" },
  "identity.secret": { en: "nsec private key", "zh-CN": "nsec 私钥" },
  "identity.showSecret": { en: "Show private key", "zh-CN": "显示私钥" },
  "identity.unlock": { en: "Unlock", "zh-CN": "解锁" },
  "identity.useAnother": { en: "Use another identity", "zh-CN": "使用其他身份" },
  "member.count": { en: "Members · {count}", "zh-CN": "成员 · {count}" },
  "member.close": { en: "Close members", "zh-CN": "关闭成员面板" },
  "member.directMessage": { en: "Message {name}", "zh-CN": "私聊 {name}" },
  "member.remoteAgent": { en: "Remote agent", "zh-CN": "远程 Agent" },
  "member.resize": { en: "Resize member panel", "zh-CN": "调整成员面板宽度" },
  "message.addAttachment": { en: "Add attachment", "zh-CN": "添加附件" },
  "message.addReaction": { en: "Add reaction", "zh-CN": "添加 Reaction" },
  "message.attachmentImage": { en: "Attachment image", "zh-CN": "附件图片" },
  "message.cancelReply": { en: "Cancel reply", "zh-CN": "取消回复" },
  "message.imageFailed": { en: "Image failed to load", "zh-CN": "图片加载失败" },
  "message.loading": { en: "Loading messages", "zh-CN": "加载消息" },
  "message.mentionSuggestions": { en: "Mention suggestions", "zh-CN": "提及成员候选" },
  "message.removeAttachment": { en: "Remove attachment", "zh-CN": "移除附件" },
  "message.reactionCount": {
    en: "{emoji}, {count} reactions",
    "zh-CN": "{emoji}，{count} 个 Reaction",
  },
  "message.replyCount": { en: "{count} replies", "zh-CN": "{count} 条回复" },
  "message.replyMessage": { en: "Reply to message", "zh-CN": "回复此消息" },
  "message.replyingTo": { en: "Replying to {name}", "zh-CN": "回复 {name}" },
  "message.replyThread": { en: "Reply in thread", "zh-CN": "在线程中回复" },
  "message.send": { en: "Send message", "zh-CN": "发送消息" },
  "message.sendFailed": { en: "Failed to send", "zh-CN": "发送失败" },
  "message.startConversation": { en: "Start the conversation", "zh-CN": "开始这段对话" },
  "nav.channels": { en: "Channels", "zh-CN": "频道" },
  "nav.closeChannels": { en: "Close channel list", "zh-CN": "关闭频道列表" },
  "nav.connecting": { en: "Connecting", "zh-CN": "正在连接" },
  "nav.directMessages": { en: "Direct messages", "zh-CN": "私聊" },
  "nav.newDm": { en: "New direct message", "zh-CN": "发起私聊" },
  "nav.onlyAdminCreate": {
    en: "Only Relay owners and admins can create channels",
    "zh-CN": "只有 Relay owner/admin 可以创建频道",
  },
  "nav.projects": { en: "Projects", "zh-CN": "项目" },
  "nav.relayOnline": { en: "Relay online", "zh-CN": "Relay 在线" },
  "nav.resize": { en: "Resize channel panel", "zh-CN": "调整频道面板宽度" },
  "system.addedBy": { en: "added by {actor}", "zh-CN": "由{actor}添加" },
  "system.archived": { en: "archived this channel", "zh-CN": "归档了此频道" },
  "system.channelCreated": { en: "created this channel", "zh-CN": "创建了此频道" },
  "system.communityAdmin": { en: "Community admin", "zh-CN": "社区管理员" },
  "system.deletedMessage": { en: "deleted a message", "zh-CN": "删除了一条消息" },
  "system.joined": { en: "joined the channel", "zh-CN": "加入了频道" },
  "system.left": { en: "left the channel", "zh-CN": "离开了频道" },
  "system.purposeChanged": {
    en: "changed the channel description to “{purpose}”",
    "zh-CN": "将频道说明更改为“{purpose}”",
  },
  "system.reaction": {
    en: "Add a reaction to the system message",
    "zh-CN": "为系统消息添加 Reaction",
  },
  "system.removed": { en: "removed {target} from the channel", "zh-CN": "将 {target} 移出了频道" },
  "system.system": { en: "System", "zh-CN": "系统" },
  "system.topicChanged": {
    en: "changed the topic to “{topic}”",
    "zh-CN": "将主题更改为“{topic}”",
  },
  "system.unarchived": { en: "unarchived this channel", "zh-CN": "取消归档此频道" },
  "system.you": { en: "You", "zh-CN": "你" },
  "thread.close": { en: "Close thread", "zh-CN": "关闭线程" },
  "thread.reply": { en: "Reply to thread", "zh-CN": "回复线程" },
  "thread.resize": { en: "Resize thread panel", "zh-CN": "调整线程面板宽度" },
  "thread.title": { en: "Thread", "zh-CN": "线程" },
  "workspace.channelActions": { en: "Channel actions", "zh-CN": "频道操作" },
  "workspace.channelControls": { en: "Channel controls", "zh-CN": "频道控件" },
  "workspace.changeIdentity": { en: "Change identity", "zh-CN": "更换身份" },
  "workspace.loadingChannels": { en: "Loading channels", "zh-CN": "加载频道" },
  "workspace.huddlesUnavailable": {
    en: "Huddles are not available in Buzz Web yet",
    "zh-CN": "Buzz Web 暂不支持语音讨论",
  },
  "workspace.members": { en: "Members: {count}", "zh-CN": "成员：{count}" },
  "workspace.noChannels": { en: "No accessible channels", "zh-CN": "没有可访问的频道" },
  "workspace.openChannels": { en: "Open channel list", "zh-CN": "打开频道列表" },
  "workspace.refreshChannels": { en: "Refresh channels", "zh-CN": "刷新频道" },
  "workspace.sendTo": { en: "Send a message to {target}", "zh-CN": "发送消息到 {target}" },
  "workspace.typing": { en: "{names} typing…", "zh-CN": "{names} 正在输入…" },
  "error.attachmentUpload": { en: "Attachment upload failed.", "zh-CN": "附件上传失败。" },
  "error.channelCreate": { en: "Failed to create channel.", "zh-CN": "创建失败。" },
  "error.channelLoad": { en: "Failed to load channels.", "zh-CN": "加载频道失败。" },
  "error.configLoad": { en: "Failed to load configuration.", "zh-CN": "无法加载配置。" },
  "error.identityUnlock": { en: "Failed to unlock identity.", "zh-CN": "身份解锁失败。" },
  "error.messageLoad": { en: "Failed to load messages.", "zh-CN": "消息加载失败。" },
  "error.messageSend": { en: "Failed to send message.", "zh-CN": "发送失败。" },
  "error.mediaLoad": { en: "Media failed to load ({status})", "zh-CN": "媒体加载失败 ({status})" },
  "error.mediaUploadStatus": {
    en: "Attachment upload failed ({status})",
    "zh-CN": "附件上传失败 ({status})",
  },
  "error.nip07InvalidEvent": {
    en: "The NIP-07 extension returned an invalid signed event.",
    "zh-CN": "NIP-07 扩展返回了无效签名事件。",
  },
  "error.nip07InvalidPubkey": {
    en: "The NIP-07 extension returned an invalid public key.",
    "zh-CN": "NIP-07 扩展返回了无效公钥。",
  },
  "error.nip07Missing": {
    en: "No NIP-07 browser signing extension was detected.",
    "zh-CN": "没有检测到 NIP-07 浏览器签名扩展。",
  },
  "error.relayAuthFailed": { en: "Relay authentication failed.", "zh-CN": "Relay 身份认证失败。" },
  "error.relayAuthTimeout": {
    en: "Relay authentication timed out.",
    "zh-CN": "Relay 身份认证超时。",
  },
  "error.relayClient": {
    en: "Relay client is not initialized.",
    "zh-CN": "Relay 客户端未初始化。",
  },
  "error.relayClosed": { en: "The Relay connection closed.", "zh-CN": "Relay 连接已关闭。" },
  "error.relayConnect": { en: "Failed to connect to Relay.", "zh-CN": "Relay 连接失败。" },
  "error.relayEventRejected": {
    en: "The Relay rejected the event.",
    "zh-CN": "Relay 拒绝了该事件。",
  },
  "error.relayIdentityRejected": {
    en: "The Relay rejected this identity. Switch to a member identity and try again.",
    "zh-CN": "Relay 已拒绝此身份，请更换成员身份后重试。",
  },
  "error.relayPublishInterrupted": {
    en: "Relay publishing was interrupted by a disconnection.",
    "zh-CN": "Relay 发布因断线而中止。",
  },
  "error.relayPublishTimeout": {
    en: "Relay publishing timed out; delivery status is unknown.",
    "zh-CN": "Relay 发布确认超时，消息状态未知。",
  },
  "error.relayQueryHttp": {
    en: "Relay HTTP query failed ({status})",
    "zh-CN": "Relay HTTP 查询失败 ({status})",
  },
  "error.relayQueryInterrupted": {
    en: "The Relay query was interrupted by a disconnection.",
    "zh-CN": "Relay 查询因断线而中止。",
  },
  "error.relayQueryTimeout": { en: "Relay query timed out.", "zh-CN": "Relay 查询超时。" },
  "error.relaySessionClosed": { en: "Relay session disconnected.", "zh-CN": "Relay 会话已断开。" },
  "error.relaySocketUnavailable": {
    en: "The Relay WebSocket is not connected.",
    "zh-CN": "Relay WebSocket 尚未连接。",
  },
  "error.relaySubscriptionClosed": {
    en: "The Relay closed the subscription.",
    "zh-CN": "Relay 关闭了订阅。",
  },
  "error.relayUrlProtocol": {
    en: "Relay addresses must use ws:// or wss://.",
    "zh-CN": "Relay 地址必须使用 ws:// 或 wss://",
  },
  "error.secretInvalid": {
    en: "Enter a valid nsec or a 64-character hexadecimal private key.",
    "zh-CN": "请输入有效的 nsec 或 64 位十六进制私钥。",
  },
  "error.secretLength": { en: "Private keys must be 32 bytes.", "zh-CN": "私钥必须是 32 字节。" },
  "error.signerLocked": { en: "Unlock your Buzz identity first.", "zh-CN": "请先解锁 Buzz 身份。" },
  "error.vaultBadPassphrase": {
    en: "The vault passphrase is incorrect, or the identity data is corrupted.",
    "zh-CN": "保险库口令不正确，或身份数据已损坏。",
  },
  "error.vaultMissing": {
    en: "This browser has no saved identity.",
    "zh-CN": "此浏览器没有已保存的身份。",
  },
  "error.vaultOpen": { en: "Failed to open the identity vault.", "zh-CN": "无法打开身份保险库。" },
  "error.vaultOperation": {
    en: "The identity vault operation failed.",
    "zh-CN": "身份保险库操作失败。",
  },
  "error.vaultPassphraseLength": {
    en: "The vault passphrase must contain at least 8 characters.",
    "zh-CN": "保险库口令至少需要 8 个字符。",
  },
  "error.vaultRead": { en: "Failed to read the identity vault.", "zh-CN": "无法读取身份保险库。" },
  "error.vaultTransaction": {
    en: "The identity vault transaction failed.",
    "zh-CN": "身份保险库事务失败。",
  },
  "error.webConfigStatus": {
    en: "Failed to load Web configuration ({status})",
    "zh-CN": "无法加载 Web 配置 ({status})",
  },
} as const;

export type MessageKey = keyof typeof messages;

export function resolveLocale(languages?: readonly string[]): AppLocale {
  const preferred =
    languages ??
    (typeof navigator === "undefined"
      ? ["en"]
      : navigator.languages.length
        ? navigator.languages
        : [navigator.language]);
  return preferred[0]?.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

export function getLocale(): AppLocale {
  return resolveLocale();
}

export function t(key: MessageKey, variables: Record<string, string | number> = {}): string {
  const template = messages[key][getLocale()];
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(variables[name] ?? ""));
}

export function initializeDocumentLanguage(): void {
  document.documentElement.lang = getLocale();
  document.title = t("app.title");
}
