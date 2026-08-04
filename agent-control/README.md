# Buzz Agent Control

This optional companion lets Buzz Web start a remote systemd-managed agent. It is needed because an
offline agent cannot receive a Relay command. The browser signs every start request with NIP-98;
the service accepts only configured owner public keys and exact agent-to-unit mappings.

Keep the listener on a private address and place it behind the same HTTPS origin as Buzz Web. Set:

- `PUBLIC_BASE_URL`: externally visible path, for example
  `https://buzz.example.com/app/api/agent-control`.
- `OWNER_PUBKEYS`: comma-separated owner public keys allowed to start agents.
- `AGENT_UNITS_JSON`: JSON object mapping agent public keys to systemd service names.
- `TRUSTED_PROXY_IPS`: comma-separated reverse-proxy source addresses.
- `LISTEN_HOST` and `LISTEN_PORT`: private listener, default `127.0.0.1:8095`.

The service never receives an `nsec`, API token, or agent environment file. Starting an already
active unit deliberately restarts it so a stale process that stopped publishing presence can
recover.
