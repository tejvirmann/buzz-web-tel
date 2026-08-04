# Buzz 远程 Codex Agent 配置与运维手册

本文记录已验证可用的 Buzz Relay、macOS Buzz Desktop 与远程 Codex Agent
接入方式。目标 Relay 为 `wss://buzz.example.com`，Relay 服务运行在
`10.0.0.10`。

本文不会记录或打印 Nostr 私钥、OpenAI/Gateway API Key、Relay token、实际
Gateway URL。文中的 `<...>` 均为需要在目标机器本地替换的占位符。

## 1. 架构与边界

```text
macOS Buzz Desktop
        |
        | wss://buzz.example.com
        v
外部 ALB（TLS、Host 与 WebSocket Upgrade 原样转发）
        |
        v
Buzz Relay: 10.0.0.10:3000
        ^
        | WebSocket、Nostr 身份、频道成员资格
        |
远程 Codex 主机上的 buzz-acp
        |
        v
codex-acp -> /usr/local/bin/codex -> 已有 Gateway
```

Relay owner、远程 Agent 与 macOS 客户端身份均为 Nostr 身份。远程 Agent
必须使用独立于 Relay owner 的私钥；只有被加入频道或私聊的 Agent 身份才能
读取该频道中的消息。

## 2. Relay 部署基线

当前 Relay 使用 Buzz `v0.5.2` 和不可变镜像：

```text
ghcr.io/block/buzz:sha-3e48f1b
```

生产栈与原有 Paseo 容器、端口、数据卷隔离。Relay 的必要配置原则如下：

- `BUZZ_DOMAIN=buzz.example.com`
- `RELAY_URL=wss://buzz.example.com`
- HTTP 仅绑定 `10.0.0.10:3000`，不直接暴露到公网。
- Postgres、Redis、MinIO、Git 使用独立网络与持久化卷。
- 所有数据库、Redis、MinIO、Git hook 与 relay 密钥随机生成并持久保存。
- ALB 为 `buzz.example.com` 配置 HTTPS 证书，并把 HTTP 与 WebSocket
  转发到 `10.0.0.10:3000`。
- ALB 健康检查使用 `/_liveness`，且不能改写原始 `Host` 或 WebSocket 的
  `Upgrade` 头。

部署或升级前先检查 Compose 渲染结果、端口冲突和密钥占位符。部署后验证：

```bash
curl -fsS https://buzz.example.com/_liveness
curl -fsS https://buzz.example.com/_readiness
```

升级时只替换为新的不可变镜像 SHA；不要使用会漂移的 `:main` 标签。

### 2.1 移动端配对 Relay

启用 NIP-43 的私有 Relay 会拒绝尚未加入 Relay 的手机身份。Buzz Desktop
会在二维码中为手机提供一个无需成员资格的临时配对 Relay；若没有专门配置，
Desktop 会按兼容规则使用主地址加 `/pair`：

```text
wss://buzz.example.com/pair
```

主 Relay 不提供该路由时，手机扫描二维码会报：

```text
WebSocket connection failed: HTTP error: 404 Not Found
```

修复方式是在 Compose 栈中增加两个服务：

- `pairing`：运行镜像内置的 `/usr/local/bin/buzz-pair-relay`，只处理短时、
  无状态、加密的 NIP-AB 配对事件；不直接发布主机端口。
- `edge`：在现有 `BUZZ_HTTP_PORT` 上监听。仅把精确路径 `/pair` 转给
  `pairing:5000`，其他 HTTP 和 WebSocket 流量转给 `relay:3000`，并保留原始
  `Host` 头。

主 Relay 的 `.env` 必须包含公开的配对 URL：

```dotenv
BUZZ_PAIRING_RELAY_URL=wss://buzz.example.com/pair
```

该变量会出现在主 Relay 的 NIP-11 文档中，让新的 Desktop 明确将二维码配对
流量发往 `/pair`。ALB 无需增加新域名、端口或路径规则，因为仍然只转发到
`10.0.0.10:3000`；路径路由由 Compose 内的 `edge` 处理。

`Caddyfile.edge` 的核心配置如下：

```caddyfile
{
  auto_https off
  admin off
}

:3000 {
  @pairing path /pair

  handle @pairing {
    reverse_proxy pairing:5000 {
      header_up Host {http.request.host}
    }
  }

  handle {
    reverse_proxy relay:3000 {
      header_up Host {http.request.host}
    }
  }
}
```

验证配对路由时，普通 HTTP 请求返回 `400` 是预期行为，因为 sidecar 只接受
WebSocket Upgrade。使用下面的请求应看到 `101 Switching Protocols`：

```bash
curl --max-time 3 -sS -i --http1.1 \
  -H 'Connection: Upgrade' \
  -H 'Upgrade: websocket' \
  -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
  https://buzz.example.com/pair
```

同时确认 NIP-11 文档已公布该 URL：

```bash
curl -fsS -H 'Accept: application/nostr+json' \
  https://buzz.example.com/ | jq '.pairing_relay_url'
```

## 3. 远程 Agent 主机的前置条件

远程 Codex 主机需要具备：

- 已检出的 Buzz 源码，以及已构建的 `buzz-acp`、`buzz` 和 `buzz-admin`。
- `codex-acp` 1.x，并且其路径在服务的 `PATH` 中。
- 已能正常工作的系统 Codex CLI：`/usr/local/bin/codex`。
- 现有 Codex 配置目录：`/root/.codex`。
- 现有 shell 配置已经 `export OPENAI_API_KEY` 与 `OPENAI_BASE_URL`，使
  Gateway-backed Codex CLI 可用。
- 可写的 Agent 工作目录，例如 `/opt/buzz-agent/workspace`。
- 一个独立的 Agent Nostr 私钥。

当前已验证的二进制路径：

```text
/opt/buzz-agent/buzz/target/release/buzz-acp
/opt/buzz-agent/buzz/target/release/buzz
/opt/buzz-agent/buzz/target/release/buzz-admin
/opt/buzz-agent/buzz/.hermit/node/bin/codex-acp
/usr/local/bin/codex
```

如需构建或更新 Buzz 二进制：

```bash
cd /opt/buzz-agent/buzz
cargo build --release -p buzz-acp -p buzz-cli -p buzz-admin
install -m 0755 target/release/buzz /usr/local/bin/buzz
```

检查版本和命令可用性：

```bash
/usr/local/bin/codex --version
/opt/buzz-agent/buzz/.hermit/node/bin/codex-acp --version
/usr/local/bin/buzz --help
```

> 注意：`buzz-cli` crate 编译出的命令名是 `buzz`，不是 `buzz-cli`。

## 4. 创建 Agent 身份

为远程 Agent 生成独立的 Nostr keypair。不要使用 Relay owner 的 `nsec`，也
不要将 Agent 私钥提交到 Git、粘贴到聊天记录或写入截图。

```bash
cd /opt/buzz-agent/buzz
target/release/buzz-admin generate-key
```

命令会给出私钥和公钥。私钥仅保存到
`/etc/buzz-agent/codex.env`，权限设为 `0600`；公钥用于把 Agent 加入频道，
并用于验证回复的签名身份。

创建目录并限制权限：

```bash
install -d -m 0700 /etc/buzz-agent /opt/buzz-agent/workspace
touch /etc/buzz-agent/codex.env
chmod 0600 /etc/buzz-agent/codex.env
```

在 `/etc/buzz-agent/codex.env` 中写入以下配置，并仅在本机替换占位符：

```dotenv
BUZZ_PRIVATE_KEY=<agent-nsec>
BUZZ_RELAY_URL=wss://buzz.example.com
BUZZ_ACP_AGENT_COMMAND=codex-acp
CODEX_PATH=/usr/local/bin/codex
BUZZ_ACP_AGENT_ARGS=
BUZZ_ACP_SUBSCRIBE=mentions
BUZZ_ACP_AGENT_OWNER=<relay-owner-public-key-hex>
BUZZ_ACP_RESPOND_TO=owner-only
```

各关键项的含义：

| 配置 | 作用 |
| --- | --- |
| `BUZZ_PRIVATE_KEY` | Agent 自己的 Nostr 私钥，用于 Relay 鉴权与回复签名。 |
| `BUZZ_RELAY_URL` | Relay 的 WebSocket 地址。 |
| `CODEX_PATH` | 强制 `codex-acp` 使用已配置好的系统 Codex CLI。 |
| `BUZZ_ACP_SUBSCRIBE=mentions` | 仅接收带 Agent `p` 标签的明确提及、私聊和线程回复，避免多个 Agent 因订阅频道全部消息而互相触发。 |
| `BUZZ_ACP_AGENT_OWNER` | 在 `owner-only` 模式下允许发起请求的 owner 公钥。 |
| `BUZZ_ACP_RESPOND_TO=owner-only` | 仅处理该 owner 签名的消息，是安全默认值。 |

`CODEX_PATH` 是本次修复的关键。`codex-acp` 默认携带一个自己的 Codex
版本；若不设置该变量，适配器会运行内置版本，而非服务器上已通过 Gateway
验证的 `/usr/local/bin/codex`。这会导致两套 Codex 配置与鉴权状态不一致。

如果需要对多个身份开放 Agent，优先使用 `allowlist` 并明确配置允许的公钥。
只有充分评估风险后才使用 `BUZZ_ACP_RESPOND_TO=anyone`。

## 5. 复用已有的 Codex Gateway 配置

系统服务不会自动继承 root 的交互 shell 环境。因此，即便手工执行 `codex`
能访问 Gateway，systemd 中的 `buzz-acp` 也可能因缺少 `OPENAI_API_KEY` 或
`OPENAI_BASE_URL` 而无法回答。

本部署不创建第二套 Codex 账号、API Key 或配置，而是复用已有：

- Codex 配置：`/root/.codex`
- Gateway 环境变量：`/root/.zshrc` 中已导出的变量
- 系统 Codex：`/usr/local/bin/codex`

`/etc/systemd/system/buzz-codex-agent.service`：

```ini
[Unit]
Description=Buzz remote Codex agent
After=network-online.target

[Service]
User=root
WorkingDirectory=/opt/buzz-agent/workspace
EnvironmentFile=/etc/buzz-agent/codex.env
Environment=HOME=/root
Environment=CODEX_HOME=/root/.codex
Environment=PATH=/opt/buzz-agent/buzz/.hermit/node/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=/usr/bin/zsh -c 'source /root/.zshrc >/dev/null 2>&1; exec /opt/buzz-agent/buzz/target/release/buzz-acp'
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

启用服务前，确认已有 CLI 的环境变量确实导出，但不要显示它们的值：

```bash
source /root/.zshrc >/dev/null 2>&1
test -n "$OPENAI_API_KEY"
test -n "$OPENAI_BASE_URL"
/usr/local/bin/codex --version
```

当前服务以 `root` 运行，是为了复用现有 root Codex 配置。后续应迁移至专用
Unix 用户，并只授予最小工作目录和所需 Gateway 环境变量；迁移时不应为了
Agent 另建一套 Codex 凭据。

## 6. 启动和检查服务

```bash
systemctl daemon-reload
systemctl enable --now buzz-codex-agent.service
systemctl status buzz-codex-agent.service --no-pager -l
journalctl -fu buzz-codex-agent.service
```

正常启动日志应包含：

```text
connected to relay at wss://buzz.example.com
agent owner: <owner-pubkey>
discovered <n> channel(s)
subscribed to channel <channel-uuid>
presence set to online
```

检查实际被调用的 Codex：

```bash
pgrep -af 'buzz-acp|codex-acp|codex.*app-server'
```

正确结果中应能看到：

```text
node /usr/local/bin/codex app-server
```

若只看到 `@agentclientprotocol/codex-acp` 目录下的内置 Codex 路径，说明
`CODEX_PATH` 没有生效；检查 `/etc/buzz-agent/codex.env` 后重启服务。

## 7. 将 Agent 加入频道或私聊

以下命令必须使用有权限的 Relay owner 或频道 admin 身份执行，而不是 Agent
身份。`<agent-public-key-hex>` 是第 4 节生成的 Agent 公钥。

```bash
export BUZZ_RELAY_URL=wss://buzz.example.com
export BUZZ_PRIVATE_KEY=<owner-nsec>

buzz channels add-member \
  --channel <channel-uuid> \
  --pubkey <agent-public-key-hex> \
  --role member
```

Agent 必须至少加入一个频道，否则启动日志会显示：

```text
discovered 0 channel(s)
no channel subscriptions resolved — agent will sit idle
```

当前部署中，Agent 已加入 `general` 频道和专用私聊频道。服务运行中新增频道
成员资格时，`buzz-acp` 会收到 membership notification 并自动订阅；一般无需
重启服务。

使用 Agent 身份设置展示资料：

```bash
set -a
source /etc/buzz-agent/codex.env
set +a

buzz users set-profile \
  --name "Codex" \
  --about "Remote coding assistant"
```

## 8. macOS Buzz Desktop 配置和使用

在 macOS Buzz Desktop 的 Relay 或连接设置中选择自定义 Relay，并填入：

```text
wss://buzz.example.com
```

若 Agent 使用 `owner-only` 模式，Desktop 必须使用与
`BUZZ_ACP_AGENT_OWNER` 相同的 owner 身份发送消息。确认 `general` 或目标
私聊的成员列表中显示 `Codex`。

Relay 首次接入时如提示 `403 Forbidden: You must be a relay member`，说明
当前 Desktop Nostr 身份不是 Relay 成员。应由 owner/admin 将该身份加入 Relay
或目标频道后重新连接。

建议在服务在线后发送新的测试消息：

```text
@Codex 回复 ping
```

私聊可测试：

```text
你能干什么？
```

Agent 的回复会作为触发消息的线程回复发布。若频道主时间线看起来没有回应，
请点开原消息的线程确认，不能仅以未展开的主时间线判断失败。

## 9. 端到端验证

### Relay 健康检查

```bash
curl -fsS https://buzz.example.com/_liveness
curl -fsS https://buzz.example.com/_readiness
```

### Agent 服务状态

```bash
systemctl is-active buzz-codex-agent.service
systemctl status buzz-codex-agent.service --no-pager -l
journalctl -u buzz-codex-agent.service -n 100 --no-pager
```

### 读取最近频道消息

只在本机临时加载 Agent 环境，不要输出私钥：

```bash
set -a
source /etc/buzz-agent/codex.env
set +a

buzz messages get --channel <channel-uuid> --limit 20 | jq .
```

成功回复具有以下特征：

- `pubkey` 是 Agent 的公钥。
- 消息带有 `e` 标签，指向被回复的用户消息。
- 客户端中该消息位于原消息的线程内。

已验证的现网测试结果：

| 场景 | 触发消息 | 结果 |
| --- | --- | --- |
| `general` | `@Codex 回复 ping` | Agent 在线程中回复 `ping`。 |
| 私聊 | `你能干什么？` | Agent 在线程中回复中文能力说明。 |

## 10. 常见故障排查

### 10.1 `relay returned 403 Forbidden: You must be a relay member`

发送消息的 Nostr 身份或 Agent 身份不是 Relay/频道成员。使用 owner/admin 身份
执行 `buzz channels add-member`，然后重新连接或确认 membership notification
已经被 Agent 收到。

### 10.2 systemd 显示 `status=217/USER`

`User=` 指定的用户不存在或无法解析。创建该服务用户并授予所需权限，或改为
实际存在的用户。当前部署使用 `User=root`，因为需要复用 root 的 Codex 配置。

### 10.3 Agent 启动但显示 `discovered 0 channel(s)`

Agent 公钥没有被加入任何频道。确认 `buzz channels add-member` 使用的是
`BUZZ_PRIVATE_KEY` 对应的公钥，而非 owner 公钥或另一个临时 keypair。

### 10.4 收到 @ 提及但没有回复

按以下顺序检查：

1. `journalctl` 中应有成功连接 Relay 和订阅频道的日志。
2. 当配置为 `owner-only` 时，发送者必须是
   `BUZZ_ACP_AGENT_OWNER` 对应的身份。
3. 不输出值地检查服务环境是否真的包含 Gateway 变量：

   ```bash
   pid=$(systemctl show -p MainPID --value buzz-codex-agent.service)
   tr '\0' '\n' < "/proc/$pid/environ" | cut -d= -f1 | \
     rg '^(OPENAI_API_KEY|OPENAI_BASE_URL|CODEX_PATH)$'
   ```

4. 确认 `CODEX_PATH=/usr/local/bin/codex` 已设置，并且子进程实际使用该路径。
5. 服务重启前处于 in-flight 状态的事件不会自动重放；重启后需要发送一条新消息。
6. 在 Desktop 中展开原消息线程，确认回复是否仅作为 thread reply 出现。

### 10.5 `codex login status` 显示 `Not logged in`

当系统通过 API-compatible Gateway 认证时，该状态本身不代表 Codex 不可用。
应以已配置的 CLI 能否完成请求、Agent 是否能对测试消息作答为准，而不是仅依赖
ChatGPT 登录状态。

## 11. 日常运维

```bash
# 持续查看 Agent 日志
journalctl -fu buzz-codex-agent.service

# 修改 /etc/buzz-agent/codex.env 或 unit 文件后的重启
systemctl daemon-reload
systemctl restart buzz-codex-agent.service

# 当前状态
systemctl status buzz-codex-agent.service --no-pager -l

# 停止并取消开机自启
systemctl disable --now buzz-codex-agent.service
```

以下数据需要独立于源码目录进行加密备份：

- `/etc/buzz-agent/codex.env`：Agent Nostr 私钥。
- Relay owner 私钥。
- `/root/.codex/config.toml` 和已有的 Gateway 配置。
- Relay 的 Postgres、MinIO、Redis 与 Git 数据卷。

这些文件不得提交到 Git、工单、聊天记录或共享截图中。
