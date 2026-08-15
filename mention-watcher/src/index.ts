import { Redis } from "@upstash/redis";
import { finalizeEvent } from "nostr-tools/pure";
import { Relay } from "nostr-tools/relay";
import type { Event as NostrEvent } from "nostr-tools/pure";

const RELAY_URL = requireEnv("BUZZ_PUBLIC_RELAY_URL");
const SITE_URL = requireEnv("SITE_URL").replace(/\/$/, "");
const RESEND_API_KEY = requireEnv("RESEND_API_KEY");
const RESEND_FROM_EMAIL = requireEnv("RESEND_FROM_EMAIL");
const OWNER_SECRET_KEY = hexToBytes(requireEnv("BUZZ_OWNER_PRIVATE_KEY_HEX"));
const COOLDOWN_SECONDS = Number(process.env.MENTION_COOLDOWN_SECONDS ?? 300);

const redis = Redis.fromEnv();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing required env var: ${name}`);
  return value;
}

function hexToBytes(hex: string): Uint8Array {
  return Uint8Array.from(hex.trim().match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: RESEND_FROM_EMAIL, to, subject, html }),
  });
  if (!response.ok) {
    console.error(`resend_failed:${response.status}:${await response.text().catch(() => "")}`);
  }
}

/** All pubkeys that have an email on file (i.e. joined through /join), so the relay subscription can filter server-side instead of us discarding every non-mention message client-side. */
async function fetchKnownPubkeys(): Promise<string[]> {
  const pubkeys = new Set<string>();
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(cursor, {
      match: "buzz:email-for-pubkey:*",
      count: 200,
    });
    for (const key of keys) pubkeys.add(key.replace("buzz:email-for-pubkey:", ""));
    cursor = nextCursor;
  } while (cursor !== "0");
  return [...pubkeys];
}

function uniqueMentionedPubkeys(event: NostrEvent): string[] {
  const seen = new Set<string>();
  for (const tag of event.tags) {
    if (tag[0] !== "p" || !tag[1]) continue;
    const pubkey = tag[1].toLowerCase();
    if (pubkey !== event.pubkey.toLowerCase()) seen.add(pubkey);
  }
  return [...seen];
}

async function notifyMention(pubkey: string, event: NostrEvent): Promise<void> {
  const cooldownKey = `buzz:mention-cooldown:${pubkey}`;
  const gotSlot = await redis.set(cooldownKey, 1, { nx: true, ex: COOLDOWN_SECONDS });
  if (!gotSlot) {
    console.log(`mention ${pubkey}: skipped (cooldown active)`);
    return;
  }

  const disabled = await redis.get(`buzz:notify-off:${pubkey}`);
  if (disabled) {
    console.log(`mention ${pubkey}: skipped (notifications off)`);
    return;
  }

  const email = await redis.get<string>(`buzz:email-for-pubkey:${pubkey}`);
  if (!email) {
    console.log(`mention ${pubkey}: skipped (no email on file)`);
    return;
  }

  const snippet = escapeHtml(event.content.slice(0, 300));
  const unsubscribeUrl = `${SITE_URL}/?disableMentionEmails=1`;
  await sendEmail(
    email,
    "You were mentioned in TEL Madison Buzz",
    `<p>You were mentioned:</p><blockquote>${snippet}</blockquote>` +
      `<p><a href="${SITE_URL}/">Open Buzz</a></p>` +
      `<p style="color:#888;font-size:12px">Don't want these? <a href="${unsubscribeUrl}">Turn off mention emails</a>.</p>`,
  );
  console.log(`mention ${pubkey}: emailed ${email}`);
}

async function handleEvent(event: NostrEvent): Promise<void> {
  if (event.kind !== 9) return;
  const mentioned = uniqueMentionedPubkeys(event);
  if (!mentioned.length) return; // shouldn't happen given the #p-filtered subscription, but be defensive
  console.log(`kind:9 event ${event.id} from ${event.pubkey} mentions [${mentioned.join(", ")}]`);
  for (const pubkey of mentioned) {
    await notifyMention(pubkey, event).catch((error) => console.error("notifyMention failed", error));
  }
}

/** Waits for the relay's proactive NIP-42 challenge to arrive, up to `timeoutMs`. */
async function waitForChallenge(relay: Relay, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!(relay as unknown as { challenge?: string }).challenge) {
    if (Date.now() > deadline) throw new Error("timed out waiting for AUTH challenge");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

const RESUBSCRIBE_INTERVAL_MS = 2 * 60 * 1000;
// Overlap each fresh subscription with a bit of the previous window, in case
// a long-lived subscription silently stops delivering events before we
// notice and force a resubscribe (observed in practice - not just theoretical).
const SUBSCRIBE_SINCE_OVERLAP_SECONDS = 150;

async function watch(): Promise<void> {
  console.log(`connecting to ${RELAY_URL}`);
  const relay = await Relay.connect(RELAY_URL);

  // This is a closed relay (NIP-42) - authenticate as the owner before
  // subscribing, or the relay rejects the subscription outright.
  await waitForChallenge(relay);
  await relay.auth(async (template) => finalizeEvent(template, OWNER_SECRET_KEY));
  console.log("connected and authenticated");

  // Filter server-side by #p so the relay only ever sends events that
  // actually mention someone we can notify, instead of every message in
  // every channel. Refreshed periodically to pick up newly joined members.
  let currentSub: ReturnType<typeof relay.subscribe> | null = null;

  const resubscribe = async () => {
    const pubkeys = await fetchKnownPubkeys();
    currentSub?.close();
    if (!pubkeys.length) {
      console.log("no known members with an email on file yet; not subscribing");
      currentSub = null;
      return;
    }
    console.log(`(re)subscribing, watching for mentions of ${pubkeys.length} known member(s)`);
    currentSub = relay.subscribe(
      [
        {
          kinds: [9],
          "#p": pubkeys,
          since: Math.floor(Date.now() / 1000) - SUBSCRIBE_SINCE_OVERLAP_SECONDS,
        },
      ],
      { onevent: (event) => void handleEvent(event as NostrEvent) },
    );
  };

  await resubscribe();
  const refreshTimer = setInterval(() => void resubscribe(), RESUBSCRIBE_INTERVAL_MS);

  await new Promise<void>((resolve) => {
    relay.onclose = () => {
      clearInterval(refreshTimer);
      console.log("relay connection closed; reconnecting in 5s");
      resolve();
    };
  });
}

async function main(): Promise<void> {
  for (;;) {
    try {
      await watch();
    } catch (error) {
      console.error("watch loop error", error);
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

void main();
