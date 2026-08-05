import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BuzzRelayClient } from "@/shared/api/relay-client";
import type { SignedNostrEvent, UnsignedNostrEvent } from "@/shared/lib/nostr-signer";

const signer = vi.hoisted(() => ({ sign: vi.fn() }));

vi.mock("@/shared/lib/nostr-signer", () => ({
  signNostrEvent: signer.sign,
}));

type SignRequest = {
  resolve: (event: SignedNostrEvent) => void;
  template: UnsignedNostrEvent;
};

const sockets: FakeWebSocket[] = [];
const signRequests: SignRequest[] = [];

class FakeWebSocket {
  static readonly OPEN = 1;

  readonly sent: string[] = [];
  readyState = 0;
  private readonly listeners = new Map<string, Set<(event: MessageEvent | Event) => void>>();

  constructor(readonly url: string) {
    sockets.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent | Event) => void): void {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  send(payload: string): void {
    this.sent.push(payload);
  }

  close(): void {
    this.readyState = 3;
  }

  open(): void {
    this.readyState = FakeWebSocket.OPEN;
  }

  receive(payload: unknown[]): void {
    this.emit("message", { data: JSON.stringify(payload) } as MessageEvent);
  }

  closeFromRelay(): void {
    this.readyState = 3;
    this.emit("close", new Event("close"));
  }

  private emit(type: string, event: MessageEvent | Event): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

function signedEvent(template: UnsignedNostrEvent, id: string): SignedNostrEvent {
  return {
    ...template,
    id,
    pubkey: "11".repeat(32),
    sig: "22".repeat(64),
  };
}

async function settleAsyncHandler(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  vi.useFakeTimers();
  sockets.length = 0;
  signRequests.length = 0;
  signer.sign.mockReset();
  signer.sign.mockImplementation(
    (template: UnsignedNostrEvent) =>
      new Promise<SignedNostrEvent>((resolve) => {
        signRequests.push({ resolve, template });
      }),
  );
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("WebSocket", FakeWebSocket);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("BuzzRelayClient authentication reconnects", () => {
  it("does not send a delayed AUTH result on a replacement WebSocket", async () => {
    const client = new BuzzRelayClient("wss://relay.example");
    void client.connect().catch(() => undefined);
    const first = sockets[0];
    first.open();
    first.receive(["AUTH", "old-challenge"]);
    expect(signRequests).toHaveLength(1);

    first.closeFromRelay();
    await settleAsyncHandler();
    await vi.advanceTimersByTimeAsync(1_000);
    const replacement = sockets[1];
    replacement.open();
    replacement.receive(["AUTH", "new-challenge"]);
    expect(signRequests).toHaveLength(2);

    signRequests[0].resolve(signedEvent(signRequests[0].template, "a".repeat(64)));
    await settleAsyncHandler();
    expect(replacement.sent).toEqual([]);

    signRequests[1].resolve(signedEvent(signRequests[1].template, "b".repeat(64)));
    await settleAsyncHandler();
    expect(replacement.sent).toHaveLength(1);
    expect(JSON.parse(replacement.sent[0] ?? "null")).toMatchObject([
      "AUTH",
      { id: "b".repeat(64) },
    ]);
    client.disconnect();
  });

  it("keeps the initial connection pending while a transient close reconnects", async () => {
    const client = new BuzzRelayClient("wss://relay.example");
    let settled = false;
    const connection = client.connect().finally(() => {
      settled = true;
    });
    sockets[0].closeFromRelay();
    await settleAsyncHandler();

    expect(settled).toBe(false);
    expect(client.connectionState).toBe("reconnecting");

    await vi.advanceTimersByTimeAsync(1_000);
    const replacement = sockets[1];
    replacement.open();
    replacement.receive(["AUTH", "new-challenge"]);
    signRequests[0].resolve(signedEvent(signRequests[0].template, "c".repeat(64)));
    await settleAsyncHandler();
    replacement.receive(["OK", "c".repeat(64), true, ""]);

    await expect(connection).resolves.toBeUndefined();
    expect(client.connectionState).toBe("connected");
    client.disconnect();
  });
});
