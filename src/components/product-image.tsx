import { useQuery } from "@tanstack/react-query";
import { productImageUrlQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function ProductImage({
  path,
  alt,
  className,
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const { data: url } = useQuery(productImageUrlQuery(path));

  if (!path || !url) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground text-xs uppercase tracking-widest",
          className,
        )}
      >
        No image
      </div>
    );
  }

  return (
    <img 
      src={url} 
      alt={alt} 
      className={cn("object-cover", className)} 
      loading="lazy" 
      crossOrigin="anonymous"
    />
  );
}
