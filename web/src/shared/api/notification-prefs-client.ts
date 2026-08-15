import { makeNip98AuthHeader } from "@/shared/lib/nip98";

function endpointUrl(): string {
  return new URL("/api/notification-prefs", window.location.origin).toString();
}

export async function getMentionEmailPref(): Promise<boolean> {
  const url = endpointUrl();
  const authorization = await makeNip98AuthHeader(url, "GET");
  const response = await fetch(url, { method: "GET", headers: { Authorization: authorization } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const json = (await response.json()) as { enabled: boolean };
  return json.enabled;
}

export async function setMentionEmailPref(enabled: boolean): Promise<void> {
  const url = endpointUrl();
  const body = JSON.stringify({ enabled });
  const authorization = await makeNip98AuthHeader(url, "POST", { body });
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}
