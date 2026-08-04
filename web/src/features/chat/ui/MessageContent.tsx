import { Download, ImageOff, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { authenticatedMediaObjectUrl } from "@/shared/api/media-client";
import { relayHttpOrigin } from "@/shared/config/runtime-config";
import { t } from "@/shared/i18n";

function isRelayMediaUrl(value: string | undefined, relayUrl: string): boolean {
  if (!value) return false;
  try {
    const origin = relayHttpOrigin(relayUrl);
    const url = new URL(value, origin);
    return url.origin === new URL(origin).origin && url.pathname.startsWith("/media/");
  } catch {
    return false;
  }
}

function ProtectedImage({ src, alt, relayUrl }: { src?: string; alt?: string; relayUrl: string }) {
  const [resolved, setResolved] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setResolved(null);
    if (!src) return;
    void authenticatedMediaObjectUrl(src, relayUrl)
      .then((url) => {
        if (!cancelled) setResolved(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [relayUrl, src]);
  if (failed) {
    return (
      <span className="inline-flex items-center gap-2 rounded border px-3 py-2 text-xs text-muted-foreground">
        <ImageOff className="h-4 w-4" /> {t("message.imageFailed")}
      </span>
    );
  }
  if (!resolved) {
    return (
      <span className="inline-flex h-24 w-40 items-center justify-center rounded bg-foreground/5">
        <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
      </span>
    );
  }
  return <img alt={alt || t("message.attachmentImage")} loading="lazy" src={resolved} />;
}

function ProtectedLink({
  href,
  children,
  relayUrl,
}: {
  href?: string;
  children: React.ReactNode;
  relayUrl: string;
}) {
  const [loading, setLoading] = useState(false);
  if (!isRelayMediaUrl(href, relayUrl)) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener">
        {children}
      </a>
    );
  }
  return (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        if (!href || loading) return;
        setLoading(true);
        void authenticatedMediaObjectUrl(href, relayUrl)
          .then((url) => {
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = String(children) || "attachment";
            anchor.click();
          })
          .finally(() => setLoading(false));
      }}
    >
      {loading ? (
        <LoaderCircle className="mr-1 inline h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="mr-1 inline h-3.5 w-3.5" />
      )}
      {children}
    </a>
  );
}

function displayContent(content: string): string {
  if (!content.trim().startsWith("{")) return content;
  try {
    const value = JSON.parse(content) as Record<string, unknown>;
    const text = value.message ?? value.text ?? value.action;
    return typeof text === "string" ? text : content;
  } catch {
    return content;
  }
}

export function MessageContent({ content, relayUrl }: { content: string; relayUrl: string }) {
  return (
    <div className="buzz-message-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => <ProtectedImage src={src} alt={alt} relayUrl={relayUrl} />,
          a: ({ href, children }) => (
            <ProtectedLink href={href} relayUrl={relayUrl}>
              {children}
            </ProtectedLink>
          ),
        }}
      >
        {displayContent(content)}
      </ReactMarkdown>
    </div>
  );
}
