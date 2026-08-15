import { kv } from "./_lib/kv";

export const config = { runtime: "edge" };

type TokenRecord =
  | { kind: "new"; email: string; inviteCode: string }
  | { kind: "returning"; email: string };

type BackupRecord = { encryptedKey: string; backupPassword: string; pubkey: string };

function isValidPubkey(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value);
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const relayUrl = process.env.BUZZ_PUBLIC_RELAY_URL;
  if (!relayUrl) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), { status: 500 });
  }

  if (request.method === "GET") {
    const token = url.searchParams.get("token") ?? "";
    if (!token) return new Response(JSON.stringify({ error: "missing_token" }), { status: 400 });

    const record = await kv.get<TokenRecord>(`buzz:token:${token}`);
    if (!record) return new Response(JSON.stringify({ error: "token_invalid" }), { status: 404 });

    if (record.kind === "new") {
      return new Response(
        JSON.stringify({ kind: "new", relayUrl, inviteCode: record.inviteCode }),
        { status: 200 },
      );
    }

    const backup = await kv.get<BackupRecord>(`buzz:backup:${record.email}`);
    if (!backup) return new Response(JSON.stringify({ error: "backup_missing" }), { status: 404 });
    return new Response(JSON.stringify({ kind: "returning", relayUrl, ...backup }), {
      status: 200,
    });
  }

  if (request.method === "POST") {
    let body: { token?: unknown; pubkey?: unknown; ncryptsec?: unknown; backupPassword?: unknown };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "invalid_body" }), { status: 400 });
    }
    const token = String(body.token ?? "");
    const pubkey = String(body.pubkey ?? "").toLowerCase();
    const ncryptsec = String(body.ncryptsec ?? "");
    const backupPassword = String(body.backupPassword ?? "");
    if (!token || !isValidPubkey(pubkey) || !ncryptsec || !backupPassword) {
      return new Response(JSON.stringify({ error: "invalid_body" }), { status: 400 });
    }

    const record = await kv.get<TokenRecord>(`buzz:token:${token}`);
    if (record?.kind !== "new") {
      return new Response(JSON.stringify({ error: "token_invalid" }), { status: 404 });
    }

    const backup: BackupRecord = { encryptedKey: ncryptsec, backupPassword, pubkey };
    await kv.set(`buzz:backup:${record.email}`, backup);
    await kv.set(`buzz:email-for-pubkey:${pubkey}`, record.email);
    await kv.del(`buzz:token:${token}`);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
}
