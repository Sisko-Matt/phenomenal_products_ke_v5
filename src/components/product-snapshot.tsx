import React, { useRef, useState } from "react";
import { Camera, Download, Share2, X, Instagram } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { formatKES, SITE } from "@/lib/site";
import { ProductImage } from "./product-image";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
const logoUrl = "/assets/logo-icon.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ProductSnapshotProps {
  product: {
    name: string;
    price_kes: number;
    image_url: string | null;
    description?: string | null;
    is_limited_offer?: boolean;
  };
  className?: string;
}

export function ProductSnapshot({ product, className }: ProductSnapshotProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { theme } = useTheme();

  const generatePreview = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    const loadingToast = toast.loading("Capturing product details...");

    try {
      // Find the image element inside the cardRef
      const imgElements = cardRef.current.querySelectorAll('img');
      
      // Pre-load all images to avoid CORS/loading issues in html-to-image
      // This is crucial for external deployment services where images might be served from different origins
      await Promise.all(
        Array.from(imgElements).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = resolve; // Continue anyway to avoid hanging
          });
        })
      );

      // Give a tiny bit more time for the browser to render the styles properly
      await new Promise((r) => setTimeout(r, 800));

      const isDark = theme === "dark";
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        backgroundColor: isDark ? "#000000" : "#ffffff",
        pixelRatio: 2, // Slightly lower but stable quality
        // Use useCors: true if html-to-image version supports it, 
        // but manually adding crossOrigin to images is more reliable.
        style: {
          borderRadius: "0",
        },
      });

      setPreviewUrl(dataUrl);
      toast.dismiss(loadingToast);
    } catch (err) {
      console.error("Snapshot failed:", err);
      toast.error("Failed to capture image. Please try again.", { id: loadingToast });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!previewUrl) return;
    const link = document.createElement("a");
    link.download = `phenomenal-${product.name.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = previewUrl;
    link.click();
    toast.success("Saved to gallery!");
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        onClick={generatePreview}
        disabled={isGenerating}
        type="button"
        className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-card px-4 py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground transition hover:border-foreground hover:text-foreground disabled:opacity-50"
      >
        <Camera className={cn("h-4 w-4", isGenerating && "animate-pulse")} />
        {isGenerating ? "Capturing..." : "Product Snapshot"}
      </button>

      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className={cn(
          "max-w-md overflow-hidden p-0 sm:rounded-2xl border-none",
          theme === "dark" ? "bg-black" : "bg-white"
        )}>
          <DialogHeader className={cn(
            "p-4 pb-0",
            theme === "dark" ? "bg-black" : "bg-white"
          )}>
            <DialogTitle className={cn(
              "font-serif text-xl",
              theme === "dark" ? "text-white" : "text-slate-900"
            )}>Preview Snapshot</DialogTitle>
          </DialogHeader>
          
          <div className={cn(
            "p-4",
            theme === "dark" ? "bg-black" : "bg-white"
          )}>
            {previewUrl && (
              <div className={cn(
                "overflow-hidden rounded-xl border shadow-2xl",
                theme === "dark" ? "border-[#c9a227]/25 shadow-[#c9a227]/10" : "border-slate-100"
              )}>
                <img 
                  src={previewUrl} 
                  alt="Product Card Preview" 
                  className="h-auto w-full"
                />
              </div>
            )}
          </div>

          <DialogFooter className={cn(
            "flex-row gap-2 border-t p-4 sm:justify-center",
            theme === "dark" ? "border-[#c9a227]/20 bg-black" : "border-slate-100 bg-white"
          )}>
            <button
              onClick={() => setPreviewUrl(null)}
              className={cn(
                "flex-1 rounded-full border py-2 text-xs font-bold uppercase tracking-widest transition",
                theme === "dark" 
                  ? "border-[#c9a227]/30 bg-black text-[#e3c96a] hover:bg-[#c9a227]/10" 
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              )}
            >
              Cancel
            </button>
            <button
              onClick={downloadImage}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-2 rounded-full py-2 text-xs font-bold uppercase tracking-widest transition hover:opacity-90 shadow-lg",
                theme === "dark"
                  ? "bg-[#e3c96a] text-black shadow-[#c9a227]/20"
                  : "bg-slate-900 text-white shadow-slate-900/10"
              )}
            >
              <Download className="h-3 w-3" />
              Download
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden high-fidelity card for snapshot generation - MATCHES CURRENT THEME */}
      <div className={cn("fixed -left-[5000px] top-0 pointer-events-none", theme)} style={{ colorScheme: theme }}>
        <div 
          ref={cardRef}
          className={cn(
            "w-[500px] p-10 font-sans relative",
            theme === "dark" ? "bg-black text-white" : "bg-white text-slate-900"
          )}
        >
          {/* Subtle Decorative Elements */}
          <div className={cn(
            "absolute top-0 right-0 w-40 h-40 blur-[60px] rounded-full",
            theme === "dark" ? "bg-[#c9a227]/15" : "bg-slate-100"
          )} />
          <div className={cn(
            "absolute bottom-0 left-0 w-40 h-40 blur-[60px] rounded-full",
            theme === "dark" ? "bg-[#c9a227]/[0.08]" : "bg-slate-50"
          )} />
          
          <div className="relative">
            {/* Header / Brand */}
            <div className={cn(
              "mb-8 flex items-center justify-between border-b pb-6",
              theme === "dark" ? "border-[#c9a227]/25" : "border-slate-200"
            )}>
              <div className="space-y-1">
                <p className={cn(
                  "text-[14px] font-black uppercase tracking-[0.3em]",
                  theme === "dark" ? "text-white" : "text-slate-900"
                )}>
                  {SITE.name}
                </p>
                <p className={cn(
                  "text-[10px] italic tracking-[0.1em]",
                  theme === "dark" ? "text-white/40" : "text-slate-500"
                )}>
                  {SITE.tagline}
                </p>
              </div>
              <img 
                src={logoUrl} 
                alt="Logo" 
                crossOrigin="anonymous"
                className={cn(
                  "h-16 w-16 object-contain",
                  theme === "dark" ? "opacity-95 drop-shadow-[0_0_10px_rgba(201,162,39,0.35)]" : "drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)]"
                )}
              />
            </div>

            {/* Product Image */}
            <div className={cn(
              "relative aspect-square w-full overflow-hidden rounded-sm border mb-8 shadow-sm",
              theme === "dark" ? "border-[#c9a227]/25 bg-white/5" : "border-slate-200 bg-slate-50"
            )}>
              <ProductImage
                path={product.image_url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
              {product.is_limited_offer && (
                <div className="absolute top-4 right-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full shadow-lg">
                  Limited Offer
                </div>
              )}
            </div>

            {/* Details matching site typography */}
            <div className="space-y-6">
              <div className="space-y-2">
                <p className={cn(
                  "text-[10px] uppercase tracking-[0.35em] font-bold",
                  theme === "dark" ? "text-[#e3c96a]" : "text-slate-500"
                )}>
                  Exclusive Piece
                </p>
                <h2 className={cn(
                  "font-serif text-3xl leading-tight tracking-tight",
                  theme === "dark" ? "text-white" : "text-slate-900"
                )}>{product.name}</h2>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <span className={cn(
                  "font-serif text-3xl font-bold tracking-tighter",
                  theme === "dark" ? "text-[#e3c96a]" : "text-slate-900"
                )}>
                  {formatKES(product.price_kes)}
                </span>
                <span className={cn(
                  "rounded-sm border px-3 py-1 text-[11px] font-black uppercase tracking-widest",
                  theme === "dark" ? "border-[#c9a227]/35 bg-[#c9a227]/10 text-[#e3c96a]" : "border-slate-200 bg-slate-50 text-slate-600"
                )}>
                  Available
                </span>
              </div>

              {product.description && (
                <p className={cn(
                  "line-clamp-4 text-xs leading-relaxed italic font-medium",
                  theme === "dark" ? "text-white/60" : "text-slate-500"
                )}>
                  "{product.description}"
                </p>
              )}

              {/* Trust badges & Socials footer */}
              <div className={cn(
                "pt-8 border-t mt-8 flex flex-col items-center gap-5",
                theme === "dark" ? "border-[#c9a227]/25" : "border-slate-200"
              )}>
                <div className="flex gap-8">
                  <div className={cn(
                    "flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest",
                    theme === "dark" ? "text-white/40" : "text-slate-500"
                  )}>
                    Nationwide Delivery
                  </div>
                  <div className={cn(
                    "flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest",
                    theme === "dark" ? "text-white/40" : "text-slate-500"
                  )}>
                    M-Pesa Accepted
                  </div>
                </div>
                
                <div className="flex flex-col items-center gap-3">
                  <div className={cn(
                    "flex items-center gap-2 text-[10px] font-bold",
                    theme === "dark" ? "text-white/80" : "text-slate-700"
                  )}>
                    <Instagram className={cn("h-3 w-3", theme === "dark" ? "text-[#e3c96a]" : "text-slate-400")} />
                    <span>@phenomenal_products_ke</span>
                  </div>
                  <div className={cn(
                    "flex items-center gap-2 text-[10px] font-bold",
                    theme === "dark" ? "text-white/80" : "text-slate-700"
                  )}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={cn("h-3 w-3", theme === "dark" ? "text-[#e3c96a]" : "text-slate-400")}>
                      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                    </svg>
                    <span>@phenomenal_products_ke</span>
                  </div>
                  <div className={cn(
                    "flex items-center gap-2 text-[10px] font-bold",
                    theme === "dark" ? "text-emerald-400" : "text-emerald-600"
                  )}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <span>+{SITE.whatsappNumber}</span>
                  </div>
                </div>

                <p className={cn(
                  "text-[10px] text-center uppercase tracking-[0.5em] font-black",
                  theme === "dark" ? "text-[#c9a227]/60" : "text-slate-400"
                )}>
                  {SITE.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
