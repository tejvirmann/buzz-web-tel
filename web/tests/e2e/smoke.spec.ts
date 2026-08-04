import { createHash } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import {
  type EventTemplate,
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
} from "nostr-tools/pure";

const DEMO_CONFIG = {
  communityName: "Buzz Community",
  relayUrl: "wss://relay.example.com",
  agentControlUrl: "https://buzz.example.com/app/api/agent-control",
  features: { projects: true, forum: true },
  demoMode: true,
  agents: [
    {
      pubkey: "a".repeat(64),
      name: "Codex(remote)",
      startable: true,
    },
    {
      pubkey: "b".repeat(64),
      name: "Grok(remote)",
      startable: true,
    },
  ],
};

async function enableDemo(
  page: Page,
  { features = DEMO_CONFIG.features }: { features?: { projects: boolean; forum: boolean } } = {},
) {
  await page.route("**/config.json", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...DEMO_CONFIG, features }),
    });
  });
}

async function expectNoViewportOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

test("chat workspace loads with Buzz branding and relay data", async ({ page }) => {
  await enableDemo(page);
  await page.goto("/");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", /app-icon\.png$/);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    /app-icon\.png$/,
  );
  await expect(page.getByRole("img", { name: "Buzz" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "general" })).toBeVisible();
  await expect(page.getByText("Relay is healthy", { exact: false })).toBeVisible();
  await expect(page.getByText("Codex(remote)").first()).toBeVisible();
  await expect(page.getByTestId("system-message-row")).toHaveCount(3);
  await expect(page.getByText("created this channel", { exact: true })).toBeVisible();
  await expect(page.getByText("added by You", { exact: true })).toHaveCount(2);
  await expect(page.getByText(/"channel_created"/)).toHaveCount(0);
  const membersButton = page.getByRole("button", { name: "Members: 3" });
  await expect(membersButton).toContainText("3");
  await membersButton.click();
  await expect(page.getByRole("button", { name: "Close members" })).toBeVisible();
  await page.getByRole("button", { name: "Close members" }).click();
  await expect(
    page.getByRole("button", { name: "Huddles are not available in Buzz Web yet" }),
  ).toBeDisabled();
  const channelActions = page.getByRole("button", { name: "Channel actions" });
  await channelActions.click();
  const channelMenu = page.getByRole("menu", { name: "Channel actions" });
  await expect(channelMenu.getByRole("menuitem", { name: "Search" })).toBeVisible();
  await expect(channelMenu.getByRole("menuitem", { name: "Refresh" })).toBeVisible();
  await expect(channelMenu.getByRole("menuitem", { name: "Settings" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(channelMenu).toBeHidden();
  await expectNoViewportOverflow(page);
  await page.screenshot({
    path: "test-results/visual/buzz-web-desktop.png",
    animations: "disabled",
  });
});

test("desktop navigation opens a remote-agent DM", async ({ page }) => {
  await enableDemo(page);
  await page.goto("/");
  const dmButton = page.getByRole("button", { name: "Codex(remote)", exact: true });
  await expect(dmButton.getByRole("img", { name: "online" })).toBeVisible();
  await dmButton.click();
  await expect(page.getByRole("heading", { name: "Codex(remote)" })).toBeVisible();
  await expect(page.getByLabel("Send a message to Codex(remote)")).toBeVisible();
});

test("Relay feature state controls preview navigation without local settings", async ({ page }) => {
  await enableDemo(page, { features: { projects: false, forum: false } });
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Projects" })).toHaveCount(0);
  await expect(page.getByText("Forums", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Settings" }).last().click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await expect(settings.getByText("Experiments", { exact: true })).toHaveCount(0);
  await expect(settings.getByRole("checkbox")).toHaveCount(0);
});

test("mobile layout exposes the channel drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enableDemo(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "general" })).toBeVisible();
  await expectNoViewportOverflow(page);
  await page.screenshot({
    path: "test-results/visual/buzz-web-mobile.png",
    animations: "disabled",
  });
  const composer = page.getByLabel("Send a message to #general");
  await composer.fill("@");
  await expect(page.getByRole("listbox", { name: "Mention suggestions" })).toBeVisible();
  await expectNoViewportOverflow(page);
  await composer.fill("");
  await page.getByRole("button", { name: "Open channel list" }).click();
  await expect(page.getByText("Buzz Community")).toBeVisible();
  await expect(page.getByRole("button", { name: "New direct message" })).toBeVisible();
  await expect(page.getByRole("separator", { name: "Resize channel panel" })).toBeHidden();
  await page.screenshot({
    path: "test-results/visual/buzz-web-mobile-drawer.png",
    animations: "disabled",
  });
});

test("mobile Inbox and Agents views remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enableDemo(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Inbox" }).last().click();
  await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
  await expect(page.getByText("Can you review the deployment checklist?").first()).toBeVisible();
  await expectNoViewportOverflow(page);
  await page.screenshot({
    path: "test-results/visual/buzz-web-inbox-mobile.png",
    animations: "disabled",
  });

  await page.getByRole("button", { name: "Agents" }).last().click();
  await expect(page.getByRole("heading", { name: "Agents" })).toBeVisible();
  await expect(page.getByText("Codex(remote)").first()).toBeVisible();
  await expectNoViewportOverflow(page);
  await page.screenshot({
    path: "test-results/visual/buzz-web-agents-mobile.png",
    animations: "disabled",
  });
});

test("desktop channel panel shrinks left and restores its saved width", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await enableDemo(page);
  await page.goto("/");

  const separator = page.getByRole("separator", { name: "Resize channel panel" });
  await expect(separator).toBeVisible();
  const before = await separator.evaluate(
    (element) => element.parentElement?.getBoundingClientRect().width ?? 0,
  );
  const handle = await separator.boundingBox();
  expect(handle).not.toBeNull();
  await page.mouse.move((handle?.x ?? 0) + 4, (handle?.y ?? 0) + 100);
  await page.mouse.down();
  await page.mouse.move((handle?.x ?? 0) - 60, (handle?.y ?? 0) + 100);
  await page.mouse.up();

  const resized = await separator.evaluate(
    (element) => element.parentElement?.getBoundingClientRect().width ?? 0,
  );
  expect(resized).toBeLessThan(before - 45);
  expect(resized).toBeGreaterThanOrEqual(180);

  await page.reload();
  const restored = await page
    .getByRole("separator", { name: "Resize channel panel" })
    .evaluate((element) => element.parentElement?.getBoundingClientRect().width ?? 0);
  expect(Math.abs(restored - resized)).toBeLessThan(2);
});

test("member and thread panels open at independent persistent widths", async ({ page }) => {
  await page.setViewportSize({ width: 1720, height: 900 });
  await enableDemo(page);
  await page.goto("/");

  await expect(page.getByRole("separator", { name: "Resize member panel" })).toHaveCount(0);
  await page.getByRole("button", { name: "Members: 3" }).click();
  const separator = page.getByRole("separator", { name: "Resize member panel" });
  await expect(separator).toBeVisible();
  const before = await separator.evaluate(
    (element) => element.parentElement?.getBoundingClientRect().width ?? 0,
  );
  expect(before).toBeGreaterThanOrEqual(240);
  expect(before).toBeLessThanOrEqual(280);
  const handle = await separator.boundingBox();
  expect(handle).not.toBeNull();
  await page.mouse.move((handle?.x ?? 0) + 4, (handle?.y ?? 0) + 100);
  await page.mouse.down();
  await page.mouse.move((handle?.x ?? 0) - 220, (handle?.y ?? 0) + 100);
  await page.mouse.up();
  const memberResized = await separator.evaluate(
    (element) => element.parentElement?.getBoundingClientRect().width ?? 0,
  );
  expect(memberResized).toBeGreaterThan(before + 190);

  const messageRow = page.locator("article").filter({
    hasText: "Relay is healthy. Postgres, Redis, MinIO, and Git are available.",
  });
  await messageRow.hover();
  await messageRow.getByRole("button", { name: "Reply in thread" }).click();

  const threadSeparator = page.getByRole("separator", { name: "Resize thread panel" });
  await expect(threadSeparator).toBeVisible();
  await expect(separator).toHaveCount(0);
  const threadDefault = await threadSeparator.evaluate(
    (element) => element.parentElement?.getBoundingClientRect().width ?? 0,
  );
  expect(threadDefault).toBeGreaterThanOrEqual(360);
  expect(threadDefault).toBeLessThanOrEqual(400);
  expect(threadDefault).toBeLessThan(memberResized - 50);
  const threadHandle = await threadSeparator.boundingBox();
  expect(threadHandle).not.toBeNull();
  await page.mouse.move((threadHandle?.x ?? 0) + 4, (threadHandle?.y ?? 0) + 100);
  await page.mouse.down();
  await page.mouse.move((threadHandle?.x ?? 0) - 100, (threadHandle?.y ?? 0) + 100);
  await page.mouse.up();
  const threadResized = await threadSeparator.evaluate(
    (element) => element.parentElement?.getBoundingClientRect().width ?? 0,
  );
  expect(threadResized).toBeGreaterThan(threadDefault + 80);
  await page.screenshot({
    path: "test-results/visual/buzz-web-thread-resized.png",
    animations: "disabled",
  });

  await page.getByRole("button", { name: "Close thread" }).click();
  await expect(threadSeparator).toHaveCount(0);
  await expect(separator).toHaveCount(0);

  await page.getByRole("button", { name: "Members: 3" }).click();
  const restoredMember = await separator.evaluate(
    (element) => element.parentElement?.getBoundingClientRect().width ?? 0,
  );
  expect(Math.abs(restoredMember - memberResized)).toBeLessThan(2);

  await page.reload();
  await expect(separator).toHaveCount(0);
  await page.getByRole("button", { name: "Members: 3" }).click();
  const persistedMember = await separator.evaluate(
    (element) => element.parentElement?.getBoundingClientRect().width ?? 0,
  );
  expect(Math.abs(persistedMember - memberResized)).toBeLessThan(2);

  const restoredMessageRow = page.locator("article").filter({
    hasText: "Relay is healthy. Postgres, Redis, MinIO, and Git are available.",
  });
  await restoredMessageRow.hover();
  await restoredMessageRow.getByRole("button", { name: "Reply in thread" }).click();
  const persistedThread = await threadSeparator.evaluate(
    (element) => element.parentElement?.getBoundingClientRect().width ?? 0,
  );
  expect(Math.abs(persistedThread - threadResized)).toBeLessThan(2);
});

test("message reactions toggle once and use the Mac-style capsule shape", async ({ page }) => {
  await enableDemo(page);
  await page.goto("/");

  const messageRow = page.locator("article").filter({
    hasText: "Document the Web client deployment as well.",
  });
  await messageRow.hover();
  await messageRow.getByRole("button", { name: "Add reaction" }).click();
  await page.getByRole("button", { name: "Reaction 👀" }).click();

  const reaction = messageRow.getByRole("button", { name: "👀, 1 reactions" });
  await expect(reaction).toBeVisible();
  await reaction.click();
  await expect(reaction).toHaveCount(0);

  await messageRow.hover();
  await messageRow.getByRole("button", { name: "Add reaction" }).click();
  await page.getByRole("button", { name: "Reaction 👀" }).click();
  await expect(reaction).toBeVisible();
  const shape = await reaction.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      height: element.getBoundingClientRect().height,
      radius: Number.parseFloat(style.borderTopLeftRadius),
    };
  });
  expect(shape.radius).toBeGreaterThanOrEqual(shape.height / 2);
  await page.screenshot({
    path: "test-results/visual/buzz-web-reaction-capsule.png",
    animations: "disabled",
  });
});

test("thread replies can target a specific message", async ({ page }) => {
  await enableDemo(page);
  await page.goto("/");

  const rootRow = page.locator("article").filter({
    hasText: "Relay is healthy. Postgres, Redis, MinIO, and Git are available.",
  });
  const rootId = await rootRow.getAttribute("data-message-id");
  if (!rootId) throw new Error("Thread root is missing its message id");
  await rootRow.hover();
  await rootRow.getByRole("button", { name: "Reply in thread" }).click();

  const thread = page.getByRole("complementary", { name: "Thread" });
  const composer = thread.getByLabel("Reply to thread");
  await composer.fill("First thread reply");
  await composer.press("Enter");

  const firstReply = thread.locator("article").filter({ hasText: "First thread reply" });
  await expect(firstReply).toBeVisible();
  const firstReplyId = await firstReply.getAttribute("data-message-id");
  if (!firstReplyId) throw new Error("Thread reply is missing its message id");
  await expect(firstReply).toHaveAttribute("data-parent-id", rootId);
  await expect(firstReply).toHaveAttribute("data-root-id", rootId);

  await firstReply.hover();
  await firstReply.getByRole("button", { name: "Reply to message" }).click();
  await expect(thread.getByTestId("reply-target")).toContainText("Replying to Alex");
  await page.screenshot({
    path: "test-results/visual/buzz-web-thread-reply-target.png",
    animations: "disabled",
  });
  await thread.getByRole("button", { name: "Cancel reply" }).click();
  await expect(thread.getByTestId("reply-target")).toHaveCount(0);

  await firstReply.hover();
  await firstReply.getByRole("button", { name: "Reply to message" }).click();
  await composer.fill("Nested thread reply");
  await composer.press("Enter");

  const nestedReply = thread.locator("article").filter({ hasText: "Nested thread reply" });
  await expect(nestedReply).toBeVisible();
  await expect(nestedReply).toHaveAttribute("data-parent-id", firstReplyId);
  await expect(nestedReply).toHaveAttribute("data-root-id", rootId);
  await expect(thread.getByTestId("reply-target")).toHaveCount(0);

  for (let index = 0; index < 10; index += 1) {
    const body = `Additional thread response ${index}`;
    await composer.fill(body);
    await composer.press("Enter");
    await expect(thread.locator("article").filter({ hasText: body })).toBeAttached();
  }
  await expect(thread.getByTestId("thread-bottom")).toBeInViewport();
});

test("mention autocomplete works in channel and thread composers", async ({ page }) => {
  await enableDemo(page);
  await page.goto("/");

  const channelComposer = page.getByLabel("Send a message to #general");
  await channelComposer.fill("@Co");
  const channelSuggestions = page.getByRole("listbox", { name: "Mention suggestions" });
  await expect(channelSuggestions.getByRole("option", { name: /Codex\(remote\)/ })).toBeVisible();
  await channelComposer.press("Enter");
  await expect(channelComposer).toHaveValue("@Codex(remote) ");

  const rootRow = page.locator("article").filter({
    hasText: "Relay is healthy. Postgres, Redis, MinIO, and Git are available.",
  });
  await rootRow.hover();
  await rootRow.getByRole("button", { name: "Reply in thread" }).click();
  const thread = page.getByRole("complementary", { name: "Thread" });
  const threadComposer = thread.getByLabel("Reply to thread");
  await threadComposer.fill("@Gr");
  const threadSuggestions = thread.getByRole("listbox", { name: "Mention suggestions" });
  await expect(threadSuggestions.getByRole("option", { name: /Grok\(remote\)/ })).toBeVisible();
  await page.screenshot({
    path: "test-results/visual/buzz-web-mention-autocomplete.png",
    animations: "disabled",
  });
  await threadComposer.press("Tab");
  await expect(threadComposer).toHaveValue("@Grok(remote) ");
  await expectNoViewportOverflow(page);
});

test("workspace tools replace chat while preserving channel navigation", async ({ page }) => {
  await enableDemo(page);
  await page.goto("/");

  const composer = page.getByLabel("Send a message to #general");
  await page.getByRole("button", { name: "Projects" }).first().click();
  const reposPanel = page.getByTestId("workspace-tool-repos");
  await expect(page).toHaveURL(/\/$/);
  await expect(reposPanel).toBeVisible();
  await expect(reposPanel.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "general", exact: true })).toHaveCount(0);
  await expect(composer).toHaveCount(0);
  await expect(page.getByRole("button", { name: "general", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Codex(remote)", exact: true })).toBeVisible();
  await page.screenshot({
    path: "test-results/visual/buzz-web-repos.png",
    animations: "disabled",
  });

  await page.getByRole("button", { name: "general", exact: true }).click();
  await expect(reposPanel).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "general" })).toBeVisible();
  await expect(composer).toBeVisible();

  await page.getByRole("button", { name: "Projects" }).first().click();
  await expect(reposPanel).toBeVisible();

  await page.getByRole("button", { name: "Agents" }).first().click();
  await expect(reposPanel).toHaveCount(0);
  await expect(page.getByTestId("workspace-tool-agents")).toBeVisible();
  await expect(page.getByRole("heading", { name: "general", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "general", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Agents" }).first().click();
  await expect(page.getByTestId("workspace-tool-agents")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "general" })).toBeVisible();
  await expect(composer).toBeVisible();
});

test("community admins can add a member or generate an invite link", async ({ page }) => {
  await enableDemo(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Invite people" }).click();
  const memberDialog = page.getByRole("dialog", { name: "Invite people" });
  await memberDialog.getByLabel("Member public key").fill("c".repeat(64));
  await memberDialog.getByRole("button", { name: "Add member" }).last().click();
  await expect(memberDialog).toBeHidden();
  await expect(page.getByText("Relay member added")).toBeVisible();

  await page.getByRole("button", { name: "Invite people" }).click();
  const inviteDialog = page.getByRole("dialog", { name: "Invite people" });
  await inviteDialog.getByRole("button", { name: "Invite link" }).click();
  await inviteDialog.getByLabel("Expires after").selectOption("604800");
  await inviteDialog.getByLabel("Limit number of uses").selectOption("3");
  await inviteDialog.getByRole("button", { name: "Generate link" }).click();
  await expect(inviteDialog.getByLabel("Generated invite link")).toHaveValue(
    /\/invite\/demo-code$/,
  );
  await page.screenshot({
    path: "test-results/visual/buzz-web-invite.png",
    animations: "disabled",
  });
});

test("remote agents can be inspected, assigned to channels, and messaged", async ({ page }) => {
  await enableDemo(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Agents" }).first().click();
  const agentsPanel = page.getByTestId("workspace-tool-agents");
  await expect(agentsPanel.getByRole("heading", { name: "Agents" })).toBeVisible();
  await expect(agentsPanel.getByText("Grok(remote)", { exact: true })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "general", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "general", exact: true })).toBeVisible();
  await expect(agentsPanel.getByText("Codex(remote)", { exact: true })).toHaveCount(1);

  await agentsPanel.getByRole("button", { name: "Manage Codex(remote)" }).first().click();
  await expect(agentsPanel.getByRole("button", { name: "Back to agents" })).toBeVisible();
  await expect(agentsPanel.getByText("Agent default", { exact: true })).toBeVisible();

  const remove = agentsPanel.getByRole("button", { name: "Remove from #general" });
  await remove.click();
  await expect(agentsPanel.getByRole("button", { name: "Add to #general" })).toBeVisible();
  await agentsPanel.getByRole("button", { name: "Add to #general" }).click();
  await expect(agentsPanel.getByRole("button", { name: "Remove from #general" })).toBeVisible();
  await page.screenshot({
    path: "test-results/visual/buzz-web-agents.png",
    animations: "disabled",
  });

  await agentsPanel.getByRole("button", { name: "Message", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Codex(remote)" })).toBeVisible();
});

test("an offline agent play button starts its service without opening a DM", async ({ page }) => {
  await enableDemo(page);
  await page.route("https://buzz.example.com/app/api/agent-control/start", async (route) => {
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ status: "accepted", action: "started" }),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Agents" }).first().click();

  const requestPromise = page.waitForRequest(
    "https://buzz.example.com/app/api/agent-control/start",
  );
  await page.getByRole("button", { name: "Start Grok(remote)" }).click();
  const request = await requestPromise;
  expect(request.method()).toBe("POST");
  expect(request.postDataJSON()).toEqual({ pubkey: "b".repeat(64) });
  expect(request.headers().authorization).toMatch(/^Nostr /);
  await expect(page.getByTestId("workspace-tool-agents")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Grok(remote)" })).toHaveCount(0);
});

test("Inbox filters unread activity and opens the source thread", async ({ page }) => {
  await enableDemo(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Inbox" }).first().click();
  const inboxPanel = page.getByTestId("workspace-tool-inbox");
  await expect(inboxPanel.getByRole("heading", { name: "Inbox" })).toBeVisible();
  await expect(inboxPanel.getByText("4 unread")).toBeVisible();
  await expect(page.getByRole("heading", { name: "general", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "general", exact: true })).toBeVisible();
  const generalUnread = page.getByTestId(
    `channel-unread-${"11111111-2222-4333-8444-555555555555"}`,
  );
  await expect(generalUnread).toBeVisible();
  await page.screenshot({
    path: "test-results/visual/buzz-web-inbox.png",
    animations: "disabled",
  });

  await inboxPanel.getByRole("combobox", { name: "Filter Inbox" }).selectOption("thread");
  const reply = inboxPanel.getByRole("button", {
    name: /Verification is complete and the result is attached/,
  });
  await reply.click();
  await expect(inboxPanel.getByText("3 unread")).toBeVisible();
  await inboxPanel.getByRole("button", { name: "Open conversation" }).click();
  await expect(page.getByRole("complementary", { name: "Thread" })).toBeVisible();
  await expect(generalUnread).toHaveCount(0);

  await page.getByRole("button", { name: "Inbox" }).first().click();
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await expect(page.getByText("0 unread")).toBeVisible();
});

test("Chinese browsers receive the Chinese interface", async ({ browser }) => {
  const context = await browser.newContext({ locale: "zh-CN" });
  const page = await context.newPage();
  await enableDemo(page);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "搜索" }).first()).toBeVisible();
  await expect(page.getByText("创建了此频道", { exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await context.close();
});

test("invite requires age and legal consent before opening Buzz", async ({ page }) => {
  await page.route("**/api/join-policy", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        policy: {
          terms_markdown: "# Terms",
          privacy_markdown: "# Privacy",
          age_attestation_required: true,
          version: "policy-v1",
        },
      }),
    });
  });
  await page.route("https://api.github.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify([
        { draft: false, prerelease: false, assets: [] },
        {
          draft: false,
          prerelease: false,
          assets: [
            {
              name: "Buzz_0.4.9_aarch64.dmg",
              browser_download_url:
                "https://github.com/block/buzz/releases/download/v0.4.9/Buzz_0.4.9_aarch64.dmg",
            },
            {
              name: "Buzz_0.4.9_x64.dmg",
              browser_download_url:
                "https://github.com/block/buzz/releases/download/v0.4.9/Buzz_0.4.9_x64.dmg",
            },
            {
              name: "Buzz_0.4.9_amd64.AppImage",
              browser_download_url:
                "https://github.com/block/buzz/releases/download/v0.4.9/Buzz_0.4.9_amd64.AppImage",
            },
            {
              name: "Buzz_0.4.9_x64-setup_alpha-unsigned.exe",
              browser_download_url:
                "https://github.com/block/buzz/releases/download/v0.4.9/Buzz_0.4.9_x64-setup_alpha-unsigned.exe",
            },
          ],
        },
      ]),
    });
  });
  await page.goto("/invite/demo-code");

  await expect(page.getByRole("link", { name: "Download it now" })).toHaveAttribute(
    "href",
    "https://github.com/block/buzz/releases/download/v0.4.9/Buzz_0.4.9_x64-setup_alpha-unsigned.exe",
  );

  const ageConfirmation = page.getByLabel("I am 18 years of age or older.");
  const agreementConfirmation = page.getByLabel(
    "I agree to the Buzz Terms of Service and Privacy Policy.",
  );
  const acceptInvite = page.getByRole("button", {
    name: "Accept invite in Buzz",
  });

  await expect(ageConfirmation).toBeVisible();
  await expect(agreementConfirmation).toBeVisible();
  await expect(acceptInvite).toBeDisabled();

  const termsLink = page.getByRole("button", { name: "Terms of Service" });
  const privacyLink = page.getByRole("button", { name: "Privacy Policy" });
  await expect(termsLink).toHaveCSS("text-decoration-line", "none");
  await expect(privacyLink).toHaveCSS("text-decoration-line", "none");
  await termsLink.hover();
  await expect(termsLink).toHaveCSS("text-decoration-line", "underline");
  await page.mouse.move(0, 0);
  await privacyLink.hover();
  await expect(privacyLink).toHaveCSS("text-decoration-line", "underline");

  await page.locator("label").filter({ hasText: "I am 18 years of age or older." }).click();
  await expect(ageConfirmation).toBeChecked();
  await expect(acceptInvite).toBeDisabled();
  await page
    .locator("label")
    .filter({
      hasText: "I agree to the Buzz Terms of Service and Privacy Policy.",
    })
    .click({ position: { x: 8, y: 8 } });
  await expect(agreementConfirmation).toBeChecked();
  await expect(acceptInvite).toBeEnabled();

  const consentBox = await page.getByTestId("invite-join-policy-notice").boundingBox();
  const acceptButtonBox = await acceptInvite.boundingBox();
  expect(consentBox?.y).toBeLessThan(acceptButtonBox?.y ?? 0);
  expect(consentBox?.width).toBe(acceptButtonBox?.width);
});

test("invite can enroll a NIP-07 identity for browser access", async ({ page }) => {
  const secretKey = generateSecretKey();
  const pubkey = getPublicKey(secretKey);
  await page.exposeFunction("signNostrTestEvent", (event: EventTemplate) =>
    finalizeEvent(event, secretKey),
  );
  await page.addInitScript((extensionPubkey) => {
    (
      window as Window & {
        signNostrTestEvent(event: Record<string, unknown>): Promise<Record<string, unknown>>;
        nostr?: {
          getPublicKey(): Promise<string>;
          signEvent(event: Record<string, unknown>): Promise<Record<string, unknown>>;
        };
      }
    ).nostr = {
      async getPublicKey() {
        return extensionPubkey;
      },
      async signEvent(event) {
        return (
          window as Window & {
            signNostrTestEvent(event: Record<string, unknown>): Promise<Record<string, unknown>>;
          }
        ).signNostrTestEvent(event);
      },
    };
  }, pubkey);
  await page.route("**/api/join-policy", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ policy: null }),
    });
  });

  let claimObserved = false;
  await page.route("**/api/invites/claim", async (route) => {
    claimObserved = true;
    const request = route.request();
    const body = request.postData() ?? "";
    expect(JSON.parse(body)).toEqual({
      code: "browser-code",
    });

    const authorization = request.headers().authorization;
    expect(authorization).toMatch(/^Nostr /);
    const event = JSON.parse(
      Buffer.from(authorization.slice("Nostr ".length), "base64").toString("utf8"),
    ) as {
      pubkey: string;
      tags: string[][];
    };
    expect(event.pubkey).toBe(pubkey);
    expect(event.tags).toContainEqual(["u", request.url()]);
    expect(event.tags).toContainEqual(["method", "POST"]);
    expect(event.tags).toContainEqual(["payload", createHash("sha256").update(body).digest("hex")]);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "joined",
        community_id: "community-id",
        host: "127.0.0.1",
        role: "member",
      }),
    });
  });

  await page.goto("/invite/browser-code");
  await page.getByRole("button", { name: "Join in browser" }).click();
  await expect(page).toHaveURL("/");
  expect(claimObserved).toBe(true);
});

test("invite asks Safari users to choose their Mac download", async ({ browser }) => {
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/26.5 Safari/605.1.15",
  });
  await context.addInitScript(() => {
    Object.defineProperties(navigator, {
      platform: { configurable: true, value: "MacIntel" },
      maxTouchPoints: { configurable: true, value: 0 },
      userAgentData: { configurable: true, value: undefined },
    });
  });
  const page = await context.newPage();
  await page.route("**/api/join-policy", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ policy: null }),
    });
  });
  await page.route("https://api.github.com/**", async (route) => {
    await route.fulfill({ status: 500 });
  });

  await page.goto("/invite/demo-code");
  const download = page.getByRole("link", { name: "Download it now" });
  await expect(download).toHaveAttribute("aria-haspopup", "dialog");
  await download.click();

  const chooser = page.getByRole("dialog", {
    name: "Which Mac do you have?",
  });
  await expect(chooser).toBeVisible();
  await expect(chooser.getByRole("link", { name: /Newer Mac/ })).toContainText(
    "2021 or later, or a late-2020 Mac with an Apple M1 chip",
  );
  await expect(chooser.getByRole("link", { name: /Older Mac/ })).toContainText(
    "2019 or earlier, or a 2020 Mac with an Intel processor",
  );
  await expect(chooser.getByText("About This Mac")).toBeVisible();

  const openedPagePromise = context.waitForEvent("page");
  await chooser.getByRole("link", { name: /Newer Mac/ }).click();
  const openedPage = await openedPagePromise;
  await expect(chooser).toBeHidden();
  await expect(openedPage).toHaveURL("https://github.com/block/buzz/releases");
  await expect(page).toHaveURL(/\/invite\/demo-code$/);
  await openedPage.close();

  await download.click();
  await expect(chooser).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(chooser).toBeHidden();
  await expect(download).toBeFocused();
  await context.close();
});

test("invite download falls back for mobile and non-desktop devices", async ({ browser }) => {
  const unsupportedDevices = [
    {
      name: "iPhone Safari",
      platform: "iPhone",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15",
      maxTouchPoints: 5,
    },
    {
      name: "iPadOS desktop mode",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15",
      maxTouchPoints: 5,
    },
    {
      name: "Android phone",
      platform: "Linux armv8l",
      userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9 Pro) AppleWebKit/537.36 Mobile",
      maxTouchPoints: 5,
    },
    {
      name: "ChromeOS",
      platform: "Linux x86_64",
      userAgent: "Mozilla/5.0 (X11; CrOS x86_64 16093.68.0) AppleWebKit/537.36",
      maxTouchPoints: 0,
    },
  ];

  for (const device of unsupportedDevices) {
    const context = await browser.newContext({ userAgent: device.userAgent });
    await context.addInitScript(({ platform, maxTouchPoints }) => {
      Object.defineProperties(navigator, {
        platform: { configurable: true, value: platform },
        maxTouchPoints: { configurable: true, value: maxTouchPoints },
        userAgentData: {
          configurable: true,
          value: { platform, mobile: maxTouchPoints > 0 },
        },
      });
    }, device);
    const page = await context.newPage();
    await page.route("**/api/join-policy", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ policy: null }),
      });
    });
    await page.route("https://api.github.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify([
          {
            draft: false,
            prerelease: false,
            assets: [
              {
                name: "Buzz_0.4.9_x64.dmg",
                browser_download_url:
                  "https://github.com/block/buzz/releases/download/v0.4.9/Buzz_0.4.9_x64.dmg",
              },
              {
                name: "Buzz_0.4.9_amd64.AppImage",
                browser_download_url:
                  "https://github.com/block/buzz/releases/download/v0.4.9/Buzz_0.4.9_amd64.AppImage",
              },
            ],
          },
        ]),
      });
    });

    await page.goto("/invite/demo-code");
    await expect(page.getByRole("link", { name: "Download it now" }), device.name).toHaveAttribute(
      "href",
      "https://github.com/block/buzz/releases",
    );
    await context.close();
  }
});
