# Buzz macOS 功能对照与 Web 路线图

基准为 `block/buzz` 的 `main` 分支提交 `631b05c`（2026-08-04）。对照范围包括
`desktop/src/app/routes.ts`、`desktop/src/features/`、Relay 事件协议和桌面端数据层。

状态说明：`已实现` 表示 Web 可与 Relay 真实互操作；`部分实现` 表示核心路径可用，但桌面端仍有
更深的管理或原生能力；`未实现` 表示当前 Web 没有对应入口。

| 功能域 | Web 状态 | 当前范围 | 仍缺少的 macOS 能力 |
| --- | --- | --- | --- |
| 身份与登录 | 部分实现 | NIP-07、导入 nsec、加密本地保险库 | 新建身份、身份备份/恢复、多身份、完整个人资料编辑 |
| Inbox | 部分实现 | 提及、私聊、线程回复、Workflow 审批，筛选、未读、详情、跳回会话 | 会话分组、Remind later、Reminders、Drafts、项目活动、精确消息定位、跨设备已读同步 |
| 频道与私聊 | 部分实现 | Stream、DM、消息、线程、Reaction、@ 提及、搜索、媒体、在线状态 | 完整 Forum、编辑/删除、收藏/静音/归档、频道浏览、未读边界、自定义 Emoji、审核操作 |
| 邀请与成员 | 部分实现 | owner/admin 直接添加 Relay 成员，按有效期和次数生成邀请链接 | 成员目录、移除成员、角色变更、批量邀请、社区资料与加入策略管理 |
| Agents | 部分实现 | `kind:10100` 远程 Agent 目录、状态、简介、响应策略、频道增删、私聊 | 本机 Agent 创建/启停、Persona、Team、模型/Provider、MCP、运行日志、会话记录、Memory、导入导出 |
| Projects | 部分实现 | NIP-34 仓库列表、目录、文件、提交、Refs 和 Clone 地址 | 创建/发布项目、Issue、PR、Review、Merge、同步与权限管理 |
| Pulse | 未实现 | - | 社区动态、Agent 活动和筛选视图 |
| Workflows | 未实现 | Inbox 可处理已有审批 | Workflow 列表、编辑、触发、Run/Step 详情、Webhook 和 Schedule |
| Reminders 与 Drafts | 未实现 | - | Inbox 内提醒、稍后提醒、草稿保存与发送 |
| 多社区 | 未实现 | 单个运行时配置对应一个 Relay | 社区新增/切换/排序、每社区导航状态与身份管理 |
| 通知 | 未实现 | Inbox 内未读徽标 | 系统通知、桌面角标、Push lease、通知偏好 |
| Huddles | 未实现 | - | 音视频房间、伴随窗口、转录频道与参与者状态 |
| Terminal | 未实现 | - | Agent/项目上下文终端和原生 PTY |
| 其他管理 | 未实现 | 基础主题和 Relay 会话信息 | 用户状态、Moderation、频道模板、本地归档、Identity archive、Mesh compute |

## 本阶段实现

### 邀请人员

- 左侧社区标题新增“邀请人员”入口，仅 Relay `owner`/`admin` 可见。
- 直接添加支持 hex 公钥或 `npub`，发布 `kind:9030`，可选择 `member` 或 `admin`。
- 邀请链接使用 `POST /api/invites`，NIP-98 事件包含请求 URL、方法、body SHA-256 和 nonce。
- 支持 1/3/7/30 天有效期，以及不限或 1/3/5/10/25 次使用上限。

### 远程 Agents 管理

- Agent 来源合并 Relay `kind:10100`、公开运行时配置和频道 `bot` 角色，Presence 优先决定在线状态。
- 可查看 Agent 简介、类型、能力、响应策略、公钥和已加入频道。
- 加入/移出频道分别发布 `kind:9000`/`kind:9001`，加入时使用 `role=bot`。
- 可直接发起 Agent 私聊。Web 不尝试启动浏览器所在机器上的 ACP 进程。

### Inbox

- 聚合当前身份的 `#p` 事件和所有可访问频道的消息事件。
- 分类为提及、私聊、线程回复和 Needs action；Workflow 请求可发布 `46030/46031` 批准或拒绝。
- 已读状态按 `Relay URL + pubkey` 隔离保存在 `localStorage`，不上传身份或 Prompt。
- 支持筛选、仅看未读、全部已读、详情，以及跳回频道或线程。

## 后续顺序

1. 完善 Inbox 和成员管理：Relay 成员列表、角色变更/移除、会话分组、消息精确定位、提醒和草稿。
2. 完善频道：Forum、频道浏览/收藏/静音/归档、消息编辑删除、自定义 Emoji 和审核。
3. 完善远程 Agent 控制面：Persona/Team、配置查看与变更、运行状态、日志和 Memory。浏览器本机进程能力继续由独立 Agent 服务承担。
4. 完善 Projects 与 Workflows：Issue/PR/Review/Merge，以及 Workflow 定义、Run 和 Schedule。
5. 评估 Web 原生替代方案：PWA Push、WebRTC Huddles 和受控远程 Terminal；这些能力不能直接照搬 Tauri API。

每一阶段都应继续使用 Relay 的标准事件/HTTP 协议，不在 Web 配置中引入公司域名、私钥、API token
或 Agent Provider 凭据。
