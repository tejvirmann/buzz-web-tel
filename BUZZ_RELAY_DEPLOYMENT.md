# Buzz Relay 生产部署手册

本文是 `buzz.example.com` 的可复用生产部署手册，覆盖：

- Buzz Relay v0.5.2
- 单机 Docker Compose 栈
- 外部 ALB TLS/WebSocket 转发
- macOS Buzz Desktop 接入
- 移动端 NIP-AB 配对
- 备份、升级和故障排查

当前生产目标：

```text
Relay 主机：10.0.0.10
公开域名：buzz.example.com
公开 Relay：wss://buzz.example.com
ALB 后端：10.0.0.10:3000
部署目录：/opt/buzz/deploy/compose
Compose 项目：buzz-prod
```

本文不包含 Nostr 私钥、数据库密码、Redis 密码、MinIO 密钥、API token 或实际
Gateway 凭据。所有 `<...>` 都必须只在目标主机本地替换。

## 1. 部署架构

```text
macOS / iOS / Android / Agent
             |
             | HTTPS + WSS
             v
外部 ALB: buzz.example.com
             |
             | HTTP + WebSocket，保留 Host 与 Upgrade
             v
10.0.0.10:3000
             |
             v
Compose edge (Caddy)
     |                         |
     | 除 /pair 以外的路径      | 精确匹配 /pair
     v                         v
Buzz Relay:3000          buzz-pair-relay:5000
     |
     +-- Postgres
     +-- Redis
     +-- MinIO
     +-- Git 持久化卷
```

`edge` 是唯一发布到主机 `3000` 端口的容器。它将普通 HTTP/WebSocket 流量
转给主 Relay，并将移动设备配对流量 `/pair` 转给无状态的 `buzz-pair-relay`。

## 2. 前置条件

- 目标主机可运行 Docker Engine 和 Docker Compose v2.24.4 以上版本。
- ALB 已具备 `buzz.example.com` 的 DNS、TLS 证书和 host 路由。
- ALB 到 `10.0.0.10:3000` 的网络和安全组已放通。
- 目标主机的 `3000` 端口不被其他服务占用。
- 具备 Relay owner 的 Nostr 公钥；对应私钥由管理员离线保存。
- 具备用于备份的安全存储位置。

部署前检查：

```bash
ssh 10.0.0.10 'docker --version && docker compose version'
ssh 10.0.0.10 'ss -ltnp | grep -E ":3000" || true'
```

> 不要直接把 Relay 的数据库、Redis、MinIO 或 Git 卷与既有 Paseo 服务共用。

## 3. 获取部署包

在目标机安装到 `/opt/buzz`。生产环境固定使用不可变镜像 SHA，而不是 `:main`：

```bash
git clone https://github.com/block/buzz.git /opt/buzz
cd /opt/buzz
git checkout v0.5.2

cd /opt/buzz/deploy/compose
cp .env.example .env
chmod 600 .env
```

当前验证过的镜像：

```text
ghcr.io/block/buzz:sha-3e48f1b
```

部署目录中的主要文件：

```text
compose.yml        主 Relay、Postgres、Redis、MinIO、pairing、edge
Caddyfile.edge     仅供外部 ALB 后端使用的 HTTP 反向代理
.env               生产配置和稳定密钥，权限 0600
run.sh             启动、检查、升级和成员管理入口
```

## 4. 生成并保存稳定密钥

所有以下值必须在首次部署时生成，并在之后的重启、升级和灾难恢复中保持不变。
示例命令只在终端本地显示结果，不能将输出复制到工单或聊天。

```bash
openssl rand -hex 32    # BUZZ_RELAY_PRIVATE_KEY
openssl rand -hex 32    # BUZZ_GIT_HOOK_HMAC_SECRET
openssl rand -hex 24    # POSTGRES_PASSWORD
openssl rand -hex 24    # REDIS_PASSWORD
openssl rand -hex 16    # BUZZ_S3_ACCESS_KEY 的随机部分
openssl rand -hex 32    # BUZZ_S3_SECRET_KEY
```

Relay owner 使用独立的 Nostr keypair。将 owner 的 **公钥** 放入
`RELAY_OWNER_PUBKEY`；`nsec` 仅供管理员在 Buzz Desktop 首次导入时使用，不应
存入 `.env`、Git 或聊天记录。

## 5. 配置 `.env`

编辑 `/opt/buzz/deploy/compose/.env`。下面是完整的结构示例：

```dotenv
# 镜像和公开地址
BUZZ_IMAGE=ghcr.io/block/buzz:sha-3e48f1b
BUZZ_DOMAIN=buzz.example.com
RELAY_URL=wss://buzz.example.com
BUZZ_MEDIA_BASE_URL=https://buzz.example.com/media
BUZZ_MEDIA_SERVER_DOMAIN=buzz.example.com
BUZZ_CORS_ORIGINS=https://buzz.example.com

# 移动端 NIP-AB 配对。edge 会把 /pair 转给内部 pairing 容器。
BUZZ_PAIRING_RELAY_URL=wss://buzz.example.com/pair

# 私有 Relay 行为
BUZZ_REQUIRE_AUTH_TOKEN=true
BUZZ_REQUIRE_RELAY_MEMBERSHIP=true
BUZZ_ALLOW_NIP_OA_AUTH=true
BUZZ_AUTO_MIGRATE=true
BUZZ_GIT_CONFORMANCE_PROBE=true
RUST_LOG=buzz_relay=info,buzz_db=info,buzz_auth=info,buzz_pubsub=info,tower_http=info

# Relay owner：仅写入 64 位十六进制公钥
RELAY_OWNER_PUBKEY=<owner-public-key-hex>

# 稳定密钥和持久化服务凭据
BUZZ_RELAY_PRIVATE_KEY=<64-hex-relay-private-key>
BUZZ_GIT_HOOK_HMAC_SECRET=<64-hex-random-secret>
POSTGRES_DB=buzz
POSTGRES_USER=buzz
POSTGRES_PASSWORD=<random-password>
REDIS_PASSWORD=<random-password>
BUZZ_S3_ACCESS_KEY=buzz-<random-access-key>
BUZZ_S3_SECRET_KEY=<random-secret-key>
BUZZ_S3_BUCKET=buzz-media

# 仅绑定到既定内网地址；edge 会发布此端口。
BUZZ_HTTP_PORT=10.0.0.10:3000
```

检查权限和占位符：

```bash
cd /opt/buzz/deploy/compose
stat -c '%a %U:%G %n' .env
grep -n 'CHANGE_ME' .env && exit 1 || true
```

预期 `.env` 的权限为 `600 root:root`。

## 6. Compose 中的移动配对配置

这一节是移动端能够扫描 Desktop 二维码的必要条件。私有 Relay 要求成员资格，
新手机在获得身份前不能直接连接主 Relay，因此必须通过独立的短时配对 Relay
完成密钥传输。

在 `compose.yml` 中：

1. 删除 `relay` 服务的主机 `ports` 映射。
2. 增加 `pairing` 服务，使用同一 Buzz 镜像中的
   `/usr/local/bin/buzz-pair-relay`。
3. 增加 `edge` 服务，作为唯一的 `BUZZ_HTTP_PORT` 发布者。

关键服务定义：

```yaml
services:
  pairing:
    image: ${BUZZ_IMAGE:-ghcr.io/block/buzz:main}
    entrypoint: ["/usr/local/bin/buzz-pair-relay"]
    environment:
      BUZZ_PAIR_RELAY_BIND_ADDR: 0.0.0.0:5000
    restart: unless-stopped
    networks:
      - buzz-net

  edge:
    image: caddy:2-alpine
    depends_on:
      relay:
        condition: service_healthy
      pairing:
        condition: service_started
    ports:
      - "${BUZZ_HTTP_PORT:-3000}:3000"
    volumes:
      - ./Caddyfile.edge:/etc/caddy/Caddyfile:ro
    restart: unless-stopped
    networks:
      - buzz-net
```

`Caddyfile.edge`：

```caddyfile
{
  # TLS 在 ALB 终止；禁止本容器尝试签发证书或开放管理端口。
  auto_https off
  admin off
}

:3000 {
  # pairing sidecar 本身不会限制路径，因此仅开放精确的 /pair。
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

配对 sidecar 没有持久化、没有历史查询能力，只接受受限的短时 NIP-AB 配对
事件。不要把它的 `5000` 端口直接发布到宿主机或公网。

## 7. ALB 配置

对外入口只需一个 HTTPS host 路由：

| 项目 | 值 |
| --- | --- |
| Host | `buzz.example.com` |
| TLS | 在 ALB 终止，使用该域名证书 |
| Target | `10.0.0.10:3000` |
| 协议 | HTTP，允许 WebSocket Upgrade |
| 健康检查 | `/_liveness`，期望 HTTP 200 |
| Host 头 | 原样转发 `buzz.example.com` |
| WebSocket | 原样转发 `Connection: Upgrade` 与 `Upgrade: websocket` |

不要为 `/pair` 配置独立的 ALB target group 或公开 `5000` 端口；该路径由内部
`edge` 代理处理。

## 8. 首次启动

在启动前先渲染 Compose。此操作不会创建容器：

```bash
cd /opt/buzz/deploy/compose
./run.sh config
```

确认输出中：

- 没有 `CHANGE_ME`。
- `edge` 发布 `10.0.0.10:3000->3000/tcp`。
- `relay` 没有直接发布主机端口。
- `pairing` 没有发布主机端口。
- 不会占用 Paseo 既有端口，例如 `8411` 和 `8780`。

启动：

```bash
./run.sh start
./run.sh status
```

正常情况下会运行以下服务：

```text
edge
pairing
relay
postgres
redis
minio
minio-init
```

检查：

```bash
docker compose --env-file .env -f compose.yml ps
docker compose --env-file .env -f compose.yml logs --tail=100 relay edge pairing
```

## 9. 部署后验证

### 9.1 入口与 Relay 健康

从可访问外部域名的机器执行：

```bash
curl -fsS https://buzz.example.com/_liveness
curl -fsS https://buzz.example.com/_readiness
```

预期分别返回：

```text
ok
{"status":"ready"}
```

### 9.2 主 Relay WebSocket

```bash
curl --max-time 3 -sS -D - -o /dev/null --http1.1 \
  -H 'Connection: Upgrade' \
  -H 'Upgrade: websocket' \
  -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
  https://buzz.example.com/ | grep -E '101 Switching Protocols'
```

### 9.3 NIP-11 和移动配对

Relay 的 NIP-11 文档必须公布配对 URL：

```bash
curl -fsS -H 'Accept: application/nostr+json' \
  https://buzz.example.com/ | jq '{supported_nips, pairing_relay_url}'
```

预期 `pairing_relay_url` 为：

```text
wss://buzz.example.com/pair
```

配对 WebSocket 必须升级成功：

```bash
curl --max-time 3 -sS -D - -o /dev/null --http1.1 \
  -H 'Connection: Upgrade' \
  -H 'Upgrade: websocket' \
  -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
  https://buzz.example.com/pair | grep -E '101 Switching Protocols'
```

对 `/pair` 发送普通 HTTP 请求时返回 `400` 是预期行为，因为它只接受 WebSocket。

### 9.4 现有服务隔离

```bash
docker ps --format '{{.Names}}\t{{.Status}}' | grep -E '^paseo-local'
```

所有既有 Paseo 容器应保持 `healthy` 或 `Up`。

## 10. macOS Desktop 与成员初始化

在 macOS Buzz Desktop 设置中选择自定义 Relay：

```text
wss://buzz.example.com
```

导入管理员安全保存的 owner `nsec` 后完成个人资料，并创建首个频道。

将成员加入 Relay/频道时使用 owner/admin 身份。部署脚本提供：

```bash
cd /opt/buzz/deploy/compose
./run.sh add-member <npub-or-hex> --role member
./run.sh list-members
```

移动端配对流程：

1. 在 Desktop 的 Mobile 设置中生成二维码。
2. 在手机 Buzz App 中扫描二维码。
3. 确认两端展示的验证码一致。
4. 在手机完成导入后，重新连接 `wss://buzz.example.com`。

若曾出现 `WebSocket connection failed: HTTP error: 404 Not Found`，在修复
`/pair` 后请重新生成二维码；二维码配对密钥是短时且一次性的。

## 11. 备份与恢复

每次升级前以及定期备份以下数据，并在同一个维护窗口获取 Postgres、MinIO 和
Git 数据卷的快照：

- `/opt/buzz/deploy/compose/.env`
- Relay owner 私钥的安全副本
- `buzz-prod-postgres-data` 卷或 `pg_dump` 备份
- `buzz-prod-minio-data` 卷和对象存储内容
- `buzz-prod-redis-data` 卷
- `buzz-prod-git-data` 卷

查看内置备份提示：

```bash
cd /opt/buzz/deploy/compose
./run.sh backup-hint
docker volume ls | grep -E 'buzz-prod'
```

恢复时先恢复 `.env` 和持久化卷，再以同一镜像 SHA 执行 `./run.sh start`。不要
在恢复途中重新生成 Relay 私钥、owner 身份或数据库密码。

## 12. 升级流程

1. 备份第 11 节列出的数据。
2. 将 `.env` 中的 `BUZZ_IMAGE` 改为新的、已验证的不可变 SHA。
3. 在维护窗口执行：

   ```bash
   cd /opt/buzz/deploy/compose
   ./run.sh config
   ./run.sh upgrade
   ```

4. 按第 9 节重新验证：健康检查、主 Relay WebSocket、NIP-11、`/pair`。
5. 检查 Desktop、远程 Agent 和既有 Paseo 服务。

`./run.sh restart` 会重建 `relay`、`pairing` 与 `edge`；这是修改 `.env`、
`compose.yml` 或 `Caddyfile.edge` 后的标准操作。

## 13. 常见故障

### Relay 健康检查失败

```bash
cd /opt/buzz/deploy/compose
docker compose --env-file .env -f compose.yml ps
docker compose --env-file .env -f compose.yml logs --tail=150 relay edge
```

先区分 ALB 失败和容器失败：在目标机执行
`curl http://10.0.0.10:3000/_liveness`，再从外部执行 HTTPS 健康检查。

### `WebSocket connection failed: HTTP error: 404 Not Found`

这是移动端配对路径缺失的典型表现。依次检查：

```bash
curl -fsS -H 'Accept: application/nostr+json' \
  https://buzz.example.com/ | jq '.pairing_relay_url'

curl --max-time 3 -sS -D - -o /dev/null --http1.1 \
  -H 'Connection: Upgrade' \
  -H 'Upgrade: websocket' \
  -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
  https://buzz.example.com/pair

docker compose --env-file .env -f compose.yml logs --tail=80 edge pairing
```

`pairing_relay_url` 缺失时，检查 `.env` 是否含
`BUZZ_PAIRING_RELAY_URL=wss://buzz.example.com/pair`，然后执行
`./run.sh restart`。

### `relay returned 403 Forbidden: You must be a relay member`

这是身份成员资格问题，不是网络问题。确认 Desktop 或 Agent 使用的 Nostr 公钥
已经被 owner/admin 加入 Relay 或目标频道。

### 远程 Codex Agent 在 Relay 重启后短暂报 502

入口切换或 Relay 重启会中断既有 WebSocket。`buzz-acp` 会自动重连并重新订阅
频道。检查：

```bash
systemctl is-active buzz-codex-agent.service
journalctl -u buzz-codex-agent.service -n 100 --no-pager
```

应看到 `autonomous reconnect succeeded` 和 `resubscribing`。如未恢复，再重启
Agent 服务：

```bash
systemctl restart buzz-codex-agent.service
```

## 14. 运行状态速查

```bash
# Relay Compose 服务
cd /opt/buzz/deploy/compose
./run.sh status

# Relay、入口与配对日志
docker compose --env-file .env -f compose.yml logs -f relay edge pairing

# 外部健康
curl -fsS https://buzz.example.com/_liveness

# NIP-11 配对 URL
curl -fsS -H 'Accept: application/nostr+json' \
  https://buzz.example.com/ | jq -r '.pairing_relay_url'

# 远程 Codex Agent
systemctl status buzz-codex-agent.service --no-pager -l
```
