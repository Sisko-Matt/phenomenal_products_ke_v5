import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { signedMediaUrlQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

function SignedImg({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const { data: url } = useQuery(signedMediaUrlQuery("product-images", path));
  if (!url) {
    return <div className={cn("bg-muted animate-pulse", className)} />;
  }
  return <img src={url} alt={alt} className={cn("object-cover", className)} loading="lazy" />;
}

function SignedVideo({ 
  path, 
  className, 
  autoPlay = false,
  muted: initialMuted = true 
}: { 
  path: string; 
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
}) {
  const { data: url } = useQuery(signedMediaUrlQuery("product-videos", path));
  const [isMuted, setIsMuted] = useState(initialMuted);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!url) return <div className={cn("bg-muted animate-pulse", className)} />;

  return (
    <div className="group relative h-full w-full">
      <video
        ref={videoRef}
        src={url}
        controls
        playsInline
        autoPlay={autoPlay}
        muted={isMuted}
        loop
        className={cn("h-full w-full object-cover", className)}
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsMuted(!isMuted);
        }}
        className="absolute bottom-4 right-14 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-opacity hover:bg-black/70 group-hover:opacity-100 md:opacity-0"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

type Slide = { type: "image" | "video"; path: string };

export function ProductMediaGallery({
  mainImage,
  images,
  videoUrl,
  alt,
}: {
  mainImage: string | null;
  images: string[];
  videoUrl: string | null;
  alt: string;
}) {
  const slides = useMemo<Slide[]>(() => {
    const out: Slide[] = [];
    // If video exists, it should be the first item (after thumbnail display)
    if (videoUrl) out.push({ type: "video", path: videoUrl });
    if (mainImage) out.push({ type: "image", path: mainImage });
    for (const p of images ?? []) {
      if (p && p !== mainImage) out.push({ type: "image", path: p });
    }
    return out;
  }, [mainImage, images, videoUrl]);

  const [active, setActive] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  
  const current = slides[active];
  const hasVideo = slides[0]?.type === "video";

  useEffect(() => {
    // Reset state when slides change
    setActive(0);
    setShowVideo(false);

    if (hasVideo) {
      const timer = setTimeout(() => {
        setShowVideo(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasVideo, slides]);

  if (!current) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-sm border border-border bg-muted text-xs uppercase tracking-widest text-muted-foreground">
        No media
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-sm border border-border bg-card">
        <AnimatePresence mode="wait">
          {hasVideo && active === 0 && !showVideo ? (
            <motion.div
              key="thumbnail-preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full"
            >
              {/* Show the main image (second item in list now) as the 2s preview for video */}
              <SignedImg path={slides[1]?.path || slides[0].path} alt={alt} className="h-full w-full" />
            </motion.div>
          ) : (
            <motion.div
              key={active}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="h-full w-full"
            >
              {current.type === "image" ? (
                <SignedImg path={current.path} alt={alt} className="h-full w-full" />
              ) : (
                <SignedVideo 
                  path={current.path} 
                  className="h-full w-full" 
                  autoPlay={active === 0} 
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {slides.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                setActive(i);
                if (i === 0 && s.type === "video") setShowVideo(true);
              }}
              className={cn(
                "relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-sm border transition",
                i === active ? "border-gold" : "border-border hover:border-gold/60",
              )}
              aria-label={`View ${s.type} ${i + 1}`}
              data-tip={s.type === "video" ? "Watch the product video" : `View photo ${i + 1}`}
            >
              {s.type === "image" ? (
                <SignedImg path={s.path} alt="" className="h-full w-full" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-black/70 text-gold">
                  <Play className="h-5 w-5" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
