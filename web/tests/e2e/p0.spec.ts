import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";

const GENERAL = "11111111-2222-4333-8444-555555555555";
const DEMO_CONFIG = {
  communityName: "Buzz Community",
  relayUrl: "wss://relay.example.com",
  agentControlUrl: "https://buzz.example.com/app/api/agent-control",
  features: { projects: true, forum: true },
  demoMode: true,
  agents: [
    { pubkey: "a".repeat(64), name: "Codex(remote)", startable: true },
    { pubkey: "b".repeat(64), name: "Grok(remote)", startable: true },
  ],
};

async function useConfig(page: Page, config: Record<string, unknown>) {
  await page.route("**/config.json", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(config),
    });
  });
}

async function openChannelActions(page: Page) {
  await page.getByRole("button", { name: "Channel actions" }).click();
  return page.getByRole("menu", { name: "Channel actions" });
}

async function openSettings(page: Page) {
  await page.getByRole("button", { name: "Settings" }).last().click();
  return page.getByRole("dialog", { name: "Settings" });
}

async function createIdentity(page: Page, passphrase: string) {
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByLabel("New vault passphrase").fill(passphrase);
  await page.getByLabel("Confirm passphrase").fill(passphrase);
  await page
    .getByLabel(
      "I understand that Buzz cannot recover this identity if I lose the encrypted vault and backup.",
    )
    .check();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByRole("button", { name: "Settings" }).last()).toBeVisible();
}

async function activePubkey(page: Page): Promise<string> {
  const settings = await openSettings(page);
  const value = (await settings.locator("dd").nth(2).textContent())?.trim() ?? "";
  expect(value).toMatch(/^[0-9a-f]{64}$/);
  return value;
}

test("channel discovery, shared preferences, archive, and member management work together", async ({
  page,
}) => {
  await useConfig(page, DEMO_CONFIG);
  await page.goto("/");

  await page.getByRole("button", { name: "Browse channels" }).click();
  const browser = page.getByRole("dialog", { name: "Browse channels" });
  await expect(browser.getByText("product", { exact: true })).toBeVisible();
  await browser.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page.getByRole("heading", { name: "product" })).toBeVisible();

  await page.getByRole("button", { name: "general", exact: true }).click();
  let menu = await openChannelActions(page);
  await menu.getByRole("menuitem", { name: "Add to favorites" }).click();
  menu = await openChannelActions(page);
  await menu.getByRole("menuitem", { name: "Mute channel" }).click();
  await expect
    .poll(() =>
      page.evaluate((channelId) => {
        const key = Object.keys(localStorage).find((candidate) =>
          candidate.startsWith("buzz:web:relay-user-state:v1:"),
        );
        if (!key) return false;
        const value = JSON.parse(localStorage.getItem(key) ?? "{}") as {
          stars?: Record<string, { enabled?: boolean }>;
          mutes?: Record<string, { enabled?: boolean }>;
        };
        return value.stars?.[channelId]?.enabled && value.mutes?.[channelId]?.enabled;
      }, GENERAL),
    )
    .toBe(true);

  await page.reload();
  menu = await openChannelActions(page);
  await expect(menu.getByRole("menuitem", { name: "Remove from favorites" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Unmute channel" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Members: 3" }).click();
  await page.getByRole("button", { name: "Add member" }).click();
  await page.getByLabel("Member public key").fill("c".repeat(64));
  await page.getByLabel("Role").selectOption("guest");
  await page.getByRole("button", { name: "Add member" }).last().click();
  const memberName = "cccccccc…cccc";
  const roleSelect = page.getByRole("combobox", { name: `Change ${memberName}'s role` });
  await expect(roleSelect).toHaveValue("guest");
  await roleSelect.selectOption("admin");
  await expect(roleSelect).toHaveValue("admin");
  const memberRow = page.locator("div.group").filter({ hasText: memberName });
  await memberRow.hover();
  await memberRow.getByRole("button", { name: `Remove ${memberName}` }).click();
  const removeDialog = page.getByRole("dialog", { name: "Remove member" });
  await removeDialog.getByRole("button", { name: "Remove member" }).click();
  await expect(page.getByText(memberName, { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Close members" }).click();

  menu = await openChannelActions(page);
  await menu.getByRole("menuitem", { name: "Archive channel" }).click();
  const archiveDialog = page.getByRole("dialog", { name: "Archive channel" });
  await archiveDialog.getByRole("button", { name: "Archive channel" }).click();
  await expect(page.getByRole("button", { name: "general", exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Browse channels" }).click();
  const archivedBrowser = page.getByRole("dialog", { name: "Browse channels" });
  await archivedBrowser.getByRole("button", { name: "Archived" }).click();
  await archivedBrowser.getByRole("button", { name: "Restore channel" }).click();
  await archivedBrowser.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("button", { name: "general", exact: true })).toBeVisible();
});

test("message lifecycle, drafts, thread drafts, and profile editing survive navigation", async ({
  page,
}) => {
  await useConfig(page, DEMO_CONFIG);
  await page.goto("/");

  const channelComposer = page.getByLabel("Send a message to #general");
  await channelComposer.fill("general draft");
  await page.getByRole("button", { name: "Codex(remote)", exact: true }).click();
  await page.getByLabel("Send a message to Codex(remote)").fill("direct draft");
  await page.getByRole("button", { name: "general", exact: true }).click();
  await expect(channelComposer).toHaveValue("general draft");
  await page.reload();
  await expect(channelComposer).toHaveValue("general draft");
  await channelComposer.press("Enter");
  await expect(channelComposer).toHaveValue("");
  await page.reload();
  await expect(channelComposer).toHaveValue("");

  const threadRoot = page.locator("article").filter({
    hasText: "Relay is healthy. Postgres, Redis, MinIO, and Git are available.",
  });
  await threadRoot.hover();
  await threadRoot.getByRole("button", { name: "Reply in thread" }).click();
  const thread = page.getByRole("complementary", { name: "Thread" });
  await thread.getByLabel("Reply to thread").fill("thread draft");
  await thread.getByRole("button", { name: "Close thread" }).click();
  await threadRoot.hover();
  await threadRoot.getByRole("button", { name: "Reply in thread" }).click();
  await expect(thread.getByLabel("Reply to thread")).toHaveValue("thread draft");
  await thread.getByRole("button", { name: "Close thread" }).click();

  const ownMessage = page.locator("article").filter({
    hasText: "Document the Web client deployment as well.",
  });
  const ownMessageId = await ownMessage.getAttribute("data-message-id");
  expect(ownMessageId).toBeTruthy();
  await ownMessage.hover();
  await ownMessage.getByRole("button", { name: "Edit message" }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit message" });
  await editDialog.getByLabel("Message").fill("Document the tested P0 deployment.");
  await editDialog.getByRole("button", { name: "Save" }).click();
  const editedRow = page.locator(`article[data-message-id="${ownMessageId}"]`);
  await expect(editedRow).toContainText("Document the tested P0 deployment.");
  await expect(editedRow).toContainText("edited");
  await editedRow.hover();
  await editedRow.getByRole("button", { name: "Delete message" }).click();
  const deleteDialog = page.getByRole("dialog", { name: "Delete message" });
  await deleteDialog.getByRole("button", { name: "Delete message" }).click();
  await expect(editedRow).toHaveAttribute("data-deleted", "true");
  await expect(editedRow).toContainText("This message was deleted");
  await expect(editedRow.getByRole("button", { name: "Edit message" })).toHaveCount(0);

  const settings = await openSettings(page);
  await expect(settings.getByText("Connected", { exact: true })).toBeVisible();
  await settings.getByLabel("Picture URL").fill("javascript:alert(1)");
  await settings.getByRole("button", { name: "Save profile" }).click();
  await expect(settings.getByText("The picture URL must use HTTP or HTTPS.")).toBeVisible();
  await settings.getByLabel("Display name").fill("Alex Web");
  await settings.getByLabel("About").fill("P0 verification profile");
  await settings.getByLabel("Picture URL").fill("https://buzz.example.com/alex.png");
  await settings.getByRole("button", { name: "Save profile" }).click();
  await expect(settings.getByText("The picture URL must use HTTP or HTTPS.")).toHaveCount(0);
  await settings.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("button", { name: "Settings" }).last()).toContainText("Alex Web");
});

test("local identities can be created, switched, backed up, deleted, and restored", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await useConfig(page, {
    ...DEMO_CONFIG,
    relayUrl: "ws://127.0.0.1:9",
    agentControlUrl: null,
    features: { projects: false, forum: false },
    demoMode: false,
    agents: [],
  });
  await page.goto("/");

  const firstVaultPassphrase = "first vault passphrase";
  await createIdentity(page, firstVaultPassphrase);
  const firstPubkey = await activePubkey(page);
  let settings = page.getByRole("dialog", { name: "Settings" });
  await settings.getByRole("button", { name: "Create encrypted backup" }).click();
  await settings.getByLabel("Backup passphrase").fill("backup passphrase 123");
  await settings.getByLabel("Confirm passphrase").fill("backup passphrase 123");
  const downloadPromise = page.waitForEvent("download");
  await settings.getByRole("button", { name: "Download backup" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("Identity backup did not produce a local download");
  const backup = (await readFile(downloadPath, "utf8")).trim();
  expect(backup).toMatch(/^ncryptsec1/);
  await settings.getByRole("button", { name: "Switch identity" }).click();

  await createIdentity(page, "second vault passphrase");
  const secondPubkey = await activePubkey(page);
  expect(secondPubkey).not.toBe(firstPubkey);
  settings = page.getByRole("dialog", { name: "Settings" });
  await settings.getByRole("button", { name: "Switch identity" }).click();

  const firstLabel = `${firstPubkey.slice(0, 12)}...${firstPubkey.slice(-8)}`;
  await page.locator("label").filter({ hasText: firstLabel }).click();
  await page.getByLabel("Vault passphrase").fill(firstVaultPassphrase);
  await page.getByRole("button", { name: "Unlock" }).click();
  expect(await activePubkey(page)).toBe(firstPubkey);
  settings = page.getByRole("dialog", { name: "Settings" });
  await settings.getByRole("button", { name: "Switch identity" }).click();

  page.once("dialog", (dialog) => void dialog.accept());
  await page
    .locator("label")
    .filter({ hasText: firstLabel })
    .getByRole("button", { name: "Forget identity" })
    .click();
  await expect(page.locator("label").filter({ hasText: firstLabel })).toHaveCount(0);
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await page.getByLabel("ncryptsec backup").fill(backup);
  await page.getByLabel("Backup passphrase").fill("backup passphrase 123");
  await page.getByLabel("New vault passphrase").fill("restored vault passphrase");
  await page.getByLabel("Confirm passphrase").fill("restored vault passphrase");
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  expect(await activePubkey(page)).toBe(firstPubkey);

  const localStorageDump = await page.evaluate(() => JSON.stringify(localStorage));
  expect(localStorageDump).not.toContain("nsec1");
  expect(localStorageDump).not.toContain("ncryptsec1");
});

test("NIP-07 login waits for an extension injected after page load", async ({ page }) => {
  await useConfig(page, {
    ...DEMO_CONFIG,
    relayUrl: "ws://127.0.0.1:9",
    agentControlUrl: null,
    features: { projects: false, forum: false },
    demoMode: false,
    agents: [],
  });
  await page.goto("/");

  const extensionLogin = page.getByRole("button", { name: "Use NIP-07 extension" });
  await expect(extensionLogin).toBeEnabled();
  await page.evaluate((extensionPubkey) => {
    window.setTimeout(() => {
      window.nostr = {
        async getPublicKey() {
          return extensionPubkey;
        },
        async signEvent() {
          throw new Error("Signing is not expected during this login test");
        },
      };
    }, 300);
  }, "d".repeat(64));
  await extensionLogin.click();
  await expect(page.getByRole("button", { name: "Settings" }).last()).toBeVisible();
});

test("P0 controls use Simplified Chinese in a Chinese browser", async ({ browser }) => {
  const context = await browser.newContext({ locale: "zh-CN" });
  const page = await context.newPage();
  await useConfig(page, DEMO_CONFIG);
  await page.goto("/");

  await page.getByRole("button", { name: "浏览频道" }).click();
  const browserDialog = page.getByRole("dialog", { name: "浏览频道" });
  await expect(browserDialog.getByRole("button", { name: "加入", exact: true })).toBeVisible();
  await browserDialog.getByRole("button", { name: "关闭" }).click();

  const ownMessage = page.locator("article").filter({
    hasText: "Document the Web client deployment as well.",
  });
  await ownMessage.hover();
  await expect(ownMessage.getByRole("button", { name: "编辑消息" })).toBeVisible();
  await page.getByRole("button", { name: "设置" }).last().click();
  const settings = page.getByRole("dialog", { name: "设置" });
  await expect(settings.getByText("已连接", { exact: true })).toBeVisible();
  await expect(settings.getByLabel("显示名称")).toBeVisible();
  await expect(settings.getByLabel("简介")).toBeVisible();
  await context.close();
});
