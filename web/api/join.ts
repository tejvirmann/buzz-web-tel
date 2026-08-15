import { sendEmail } from "./_lib/email";
import { kv } from "./_lib/kv";
import { hexToBytes, ownerSignedFetch } from "./_lib/nostr";

export const config = { runtime: "edge" };

const TOKEN_TTL_SECONDS = 60 * 30;
const INVITE_TTL_SECONDS = 60 * 60 * 24 * 7;

type TokenRecord =
  | { kind: "new"; email: string; inviteCode: string }
  | { kind: "returning"; email: string };

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
  }

  const ownerKeyHex = process.env.BUZZ_OWNER_PRIVATE_KEY_HEX;
  const relayHttpOrigin = process.env.BUZZ_RELAY_HTTP_ORIGIN;
  const siteUrl = process.env.SITE_URL;
  if (!ownerKeyHex || !relayHttpOrigin || !siteUrl) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), { status: 500 });
  }

  let email: string;
  try {
    const payload = (await request.json()) as { email?: unknown };
    email = String(payload.email ?? "")
      .trim()
      .toLowerCase();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_body" }), { status: 400 });
  }
  if (!isValidEmail(email)) {
    return new Response(JSON.stringify({ error: "invalid_email" }), { status: 400 });
  }

  const token = randomToken();
  const claimUrl = `${siteUrl.replace(/\/$/, "")}/claim?token=${token}`;
  const existingBackup = await kv.get(`buzz:backup:${email}`);

  if (existingBackup) {
    const record: TokenRecord = { kind: "returning", email };
    await kv.set(`buzz:token:${token}`, record, { ex: TOKEN_TTL_SECONDS });
    await sendEmail(
      email,
      "Log back into TEL Madison Buzz",
      `<p>Click below to get back into TEL Madison's chat:</p><p><a href="${claimUrl}">Log back in</a></p><p>This link expires in 30 minutes.</p>`,
    );
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const ownerKey = hexToBytes(ownerKeyHex);
  const inviteResponse = await ownerSignedFetch(
    `${relayHttpOrigin.replace(/\/$/, "")}/api/invites`,
    "POST",
    ownerKey,
    JSON.stringify({ ttl_secs: INVITE_TTL_SECONDS }),
  );
  if (!inviteResponse.ok) {
    return new Response(JSON.stringify({ error: "invite_mint_failed" }), { status: 502 });
  }
  const invite = (await inviteResponse.json()) as { code: string };

  const record: TokenRecord = { kind: "new", email, inviteCode: invite.code };
  await kv.set(`buzz:token:${token}`, record, { ex: TOKEN_TTL_SECONDS });
  await sendEmail(
    email,
    "Join TEL Madison Buzz",
    `<p>You're invited to TEL Madison's chat.</p><p><a href="${claimUrl}">Join now</a></p><p>This link expires in 30 minutes.</p>`,
  );
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
