import { MessageCircle } from "lucide-react";
import { SITE } from "@/lib/site";

export function FloatingWhatsapp() {
  return (
    <a
      href={`https://wa.me/${SITE.whatsappNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      data-tip-side="left"
      data-tip="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-success text-white shadow-[0_10px_30px_-5px_rgba(0,0,0,0.5)] animate-pulse-brand hover:scale-105 transition"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
