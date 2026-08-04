import { useEffect, useState } from "react";
import { hasNip07Provider } from "@/shared/lib/nostr-signer";

export function useNip07Availability(): boolean {
  const [available, setAvailable] = useState(hasNip07Provider);

  useEffect(() => {
    if (available) return;
    const check = () => {
      if (hasNip07Provider()) setAvailable(true);
    };
    const interval = window.setInterval(check, 250);
    const stopPolling = window.setTimeout(() => window.clearInterval(interval), 10_000);
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check);
    document.addEventListener("visibilitychange", check);
    check();
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(stopPolling);
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [available]);

  return available;
}
