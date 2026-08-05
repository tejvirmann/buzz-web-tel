import { defineConfig, devices } from "@playwright/test";

function liveBaseUrl(): string {
  const value = process.env.BUZZ_LIVE_BASE_URL?.trim();
  if (!value) throw new Error("BUZZ_LIVE_BASE_URL is required for live Relay acceptance tests.");

  const url = new URL(value);
  const localHttp = url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname);
  if (url.protocol !== "https:" && !localHttp) {
    throw new Error("BUZZ_LIVE_BASE_URL must use HTTPS, except for localhost.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      "BUZZ_LIVE_BASE_URL must not contain credentials, query parameters, or a hash.",
    );
  }
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url.toString();
}

function browserEnvironment(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        entry[1] !== undefined &&
        entry[0] !== "BUZZ_LIVE_ADMIN_NSEC" &&
        entry[0] !== "BUZZ_LIVE_MEMBER_NSEC",
    ),
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/live-p0.spec.ts"],
  timeout: 120_000,
  globalTimeout: 10 * 60_000,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: liveBaseUrl(),
    launchOptions: { env: browserEnvironment() },
    locale: "en-US",
    screenshot: "off",
    trace: "off",
    video: "off",
  },
});
