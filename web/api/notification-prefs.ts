import { kv } from "./_lib/kv";
import { verifyNip98 } from "./_lib/nostr";

export const config = { runtime: "edge" };

/** Preference defaults to enabled: any pubkey with no explicit "off" record gets emailed on mention. */
export default async function handler(request: Request): Promise<Response> {
  const pubkey = await verifyNip98(
    request.headers.get("Authorization"),
    request.url,
    request.method,
  );
  if (!pubkey) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });

  if (request.method === "GET") {
    const disabled = await kv.get(`buzz:notify-off:${pubkey}`);
    return new Response(JSON.stringify({ enabled: !disabled }), { status: 200 });
  }

  if (request.method === "POST") {
    let body: { enabled?: unknown };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "invalid_body" }), { status: 400 });
    }
    if (body.enabled === false) {
      await kv.set(`buzz:notify-off:${pubkey}`, true);
    } else {
      await kv.del(`buzz:notify-off:${pubkey}`);
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
}
