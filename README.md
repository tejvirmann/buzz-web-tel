# Buzz Web

Buzz Web is a standalone browser client for a Buzz Relay. It provides Inbox, channels, direct
messages, threads, reactions, search, media, presence, Relay invitations, remote-agent management,
and NIP-34 repository browsing without bundling or modifying the Relay itself. The detailed macOS
comparison and implementation roadmap are tracked in [FEATURE_PARITY.md](FEATURE_PARITY.md).

## Development

Requirements: Node.js 24 and npm.

```bash
cd web
npm ci
npm run dev
```

The default `web/public/config.json` connects to a same-origin Relay and contains no deployment or
organization-specific data. For local development against another Relay, set `relayUrl` to a
`ws://` or `wss://` URL.

```json
{
  "communityName": "Buzz",
  "relayUrl": "wss://buzz.example.com",
  "features": {
    "projects": false,
    "forum": false
  },
  "agents": []
}
```

Agent names and profiles normally come from Relay membership and kind `0` profile events. The
optional `agents` list only supplies fallback names before those events are available.
Preview navigation is controlled centrally by the Relay deployment's public `features` object.
Clients cannot override it in browser settings; omitted or non-boolean flags remain disabled.

## Authentication

Users can sign with a NIP-07 browser extension or import an `nsec`. An imported key can optionally
be encrypted with PBKDF2 and AES-GCM in IndexedDB. While unlocked, a local key remains in the page's
main-thread memory; NIP-07 is preferable on shared devices.

## Internationalization

The chat interface follows the browser's first preferred language. Chinese locales use Simplified
Chinese; all other locales use English. User, channel, repository, and agent content is shown in its
original language.

## Production

The `deploy` directory contains a generic Compose example. Set `BUZZ_WEB_BIND_ADDRESS`,
`BUZZ_WEB_PORT`, and the runtime `config.json` for each environment. Never place an `nsec`, Relay API
token, owner key, or agent credential in `config.json`; it is a public browser asset.

```bash
docker compose -f deploy/compose.yml config
docker compose -f deploy/compose.yml build
docker compose -f deploy/compose.yml up -d
```

The default image serves the app at `/app/` and exposes `/app/healthz` for health checks.

## Verification

```bash
cd web
npm run typecheck
npm test
npm run check
npm run test:e2e
```
