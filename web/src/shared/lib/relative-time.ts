import { getLocale } from "@/shared/i18n";

/** Format a Unix timestamp (seconds) using the browser-selected application locale. */
export function relativeTime(unix: number): string {
  const seconds = Math.round(unix - Date.now() / 1_000);
  const formatter = new Intl.RelativeTimeFormat(getLocale(), { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return formatter.format(days, "day");
  return formatter.format(Math.round(days / 30), "month");
}
