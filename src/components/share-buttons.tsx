import { useState } from "react";
import { Share2, Copy, Check, Instagram, Facebook } from "lucide-react";
import { toast } from "sonner";

function waIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5L2 22l5.19-1.36a9.9 9.9 0 0 0 4.85 1.24h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2Zm5.83 14.06c-.24.68-1.4 1.3-1.94 1.35-.5.05-1.13.07-1.82-.11a16.5 16.5 0 0 1-1.65-.61c-2.9-1.25-4.79-4.17-4.94-4.37-.14-.19-1.18-1.57-1.18-3s.75-2.13 1.02-2.42c.27-.29.58-.36.78-.36l.56.01c.18 0 .42-.07.66.5.24.58.83 2.01.9 2.16.07.14.12.31.02.5-.1.19-.15.31-.29.48l-.44.51c-.14.14-.29.3-.13.59.17.29.74 1.22 1.59 1.98 1.09.97 2.01 1.27 2.3 1.42.29.14.46.12.63-.07.17-.19.72-.84.91-1.13.19-.29.39-.24.65-.14.26.09 1.69.8 1.98.94.29.14.48.22.55.34.07.12.07.68-.16 1.36Z" />
    </svg>
  );
}

export function ShareButtons({ title, className }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? "" : window.location.href;
  const text = `${title} — Phenomenal Products KE`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied — paste it in your Instagram story or bio.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link.");
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
      } catch {
        /* user cancelled */
      }
    } else {
      copyLink();
    }
  }

  const base =
    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-gold hover:text-gold";

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Share</span>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={base}
          aria-label="Share on WhatsApp"
          data-tip="Share this piece on WhatsApp"
        >
          {waIcon()}
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={base}
          aria-label="Share on Facebook"
          data-tip="Share this piece on Facebook"
        >
          <Facebook className="h-4 w-4" />
        </a>
        <button
          type="button"
          onClick={copyLink}
          className={base}
          aria-label="Copy link for Instagram"
          data-tip="Copy the link to share on Instagram"
        >
          <Instagram className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={copyLink}
          className={base}
          aria-label="Copy link"
          data-tip="Copy this product link"
        >
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={nativeShare}
          className={`${base} sm:hidden`}
          aria-label="More sharing options"
          data-tip="More sharing options"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
