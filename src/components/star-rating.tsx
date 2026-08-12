import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  size = 16,
  className,
  onChange,
}: {
  value: number;
  size?: number;
  className?: string;
  onChange?: (n: number) => void;
}) {
  const interactive = !!onChange;
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        return (
          <button
            key={n}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(n)}
            className={cn(
              "transition",
              interactive && "hover:scale-110 cursor-pointer",
              !interactive && "cursor-default",
            )}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            data-tip={interactive ? `Rate ${n} star${n > 1 ? "s" : ""}` : undefined}
          >
            <Star
              width={size}
              height={size}
              className={cn(
                filled ? "fill-[var(--gold)] text-[var(--gold)]" : "text-muted-foreground",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
