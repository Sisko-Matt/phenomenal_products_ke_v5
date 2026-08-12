import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { StarRating } from "@/components/star-rating";
import { productReviewsQuery, isAdminQuery, type Review } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "@tanstack/react-router";

export function ReviewsSection({ productId }: { productId: string }) {
  const { user } = useAuth();
  const { data: reviews = [], isLoading } = useQuery(productReviewsQuery(productId));
  const { data: isAdmin } = useQuery(isAdminQuery(user?.id ?? null));
  const qc = useQueryClient();

  const visibleReviews = useMemo(
    () => reviews.filter((r) => r.is_visible),
    [reviews],
  );

  const stats = useMemo(() => {
    if (visibleReviews.length === 0) return { avg: 0, count: 0 };
    const sum = visibleReviews.reduce((s, r) => s + r.rating, 0);
    return { avg: sum / visibleReviews.length, count: visibleReviews.length };
  }, [visibleReviews]);

  const myReview = user ? reviews.find((r) => r.user_id === user.id) : undefined;

  async function del(r: Review) {
    if (!confirm("Delete this review?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", r.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Review deleted.");
      qc.invalidateQueries({ queryKey: ["reviews", productId] });
    }
  }

  async function toggleVisibility(r: Review) {
    const { error } = await supabase
      .from("reviews")
      .update({ is_visible: !r.is_visible })
      .eq("id", r.id);
    if (error) toast.error(error.message);
    else {
      toast.success(r.is_visible ? "Review hidden from customers." : "Review is now visible.");
      qc.invalidateQueries({ queryKey: ["reviews", productId] });
    }
  }


  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gold">Reviews</p>
          <h2 className="mt-2 font-serif text-3xl md:text-4xl">What customers say</h2>
        </div>
        {stats.count > 0 && (
          <div className="flex items-center gap-3">
            <StarRating value={stats.avg} size={18} />
            <span className="font-serif text-lg">{stats.avg.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">
              ({stats.count} {stats.count === 1 ? "review" : "reviews"})
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-10 md:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading reviews…</p>
          ) : (isAdmin ? reviews : visibleReviews).length === 0 ? (
            <div className="rounded-sm border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">No reviews yet — be the first.</p>
            </div>
          ) : (
            (isAdmin ? reviews : visibleReviews).map((r) => (
              <article
                key={r.id}
                className={`rounded-sm border border-border/60 bg-card p-5 ${
                  r.is_visible ? "" : "opacity-60"
                }`}
              >
                <header className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="font-serif text-base">
                      {r.display_name || "Customer"}
                      {!r.is_visible && (
                        <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                          Hidden
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("en-KE", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <StarRating value={r.rating} size={14} />
                </header>
                {r.comment && (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {r.comment}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-4">
                  {isAdmin && (
                    <button
                      onClick={() => toggleVisibility(r)}
                      data-tip={r.is_visible ? "Hide this review from shoppers" : "Make this review public again"}
                      className="inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-muted-foreground hover:text-gold"
                    >
                      {r.is_visible ? (
                        <>
                          <EyeOff className="h-3 w-3" /> Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" /> Show
                        </>
                      )}
                    </button>
                  )}
                  {(user?.id === r.user_id || isAdmin) && (
                    <button
                      onClick={() => del(r)}
                      data-tip="Delete this review permanently"
                      className="inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  )}
                </div>
              </article>
            ))
          )}

        </div>

        <aside className="h-fit rounded-sm border border-border bg-card p-6">
          {!user ? (
            <div>
              <h3 className="font-serif text-lg">Leave a review</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in to share your experience.
              </p>
              <Link
                to="/auth"
                className="mt-4 inline-block rounded-sm bg-gold px-5 py-2 text-xs uppercase tracking-[0.2em] text-gold-foreground"
              >
                Sign in
              </Link>
            </div>
          ) : myReview ? (
            <div>
              <h3 className="font-serif text-lg">Your review</h3>
              <div className="mt-3 flex items-center gap-2">
                <StarRating value={myReview.rating} size={16} />
              </div>
              {myReview.comment && (
                <p className="mt-3 text-sm text-muted-foreground">{myReview.comment}</p>
              )}
              <button
                onClick={() => del(myReview)}
                data-tip="Delete your review permanently"
                className="mt-4 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" /> Delete my review
              </button>
            </div>
          ) : (
            <ReviewForm
              productId={productId}
              defaultName={user.user_metadata?.full_name || user.email?.split("@")[0] || ""}
              onDone={() => qc.invalidateQueries({ queryKey: ["reviews", productId] })}
            />
          )}
        </aside>
      </div>
    </section>
  );
}

function ReviewForm({
  productId,
  defaultName,
  onDone,
}: {
  productId: string;
  defaultName: string;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [name, setName] = useState(defaultName);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: session } = await supabase.auth.getUser();
    const uid = session.user?.id;
    if (!uid) {
      toast.error("Please sign in.");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("reviews").insert({
      product_id: productId,
      user_id: uid,
      rating,
      comment: comment.trim() || null,
      display_name: name.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Thank you for your review!");
    setComment("");
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h3 className="font-serif text-lg">Leave a review</h3>
      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Rating
        </label>
        <StarRating value={rating} size={22} onChange={setRating} />
      </div>
      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Display name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-sm border border-border bg-[var(--input)] px-3 py-2 text-sm outline-none focus:border-gold"
          placeholder="Your name"
          data-tip="The name shown next to your review"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Comment (optional)
        </label>
        <textarea
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          data-tip="Tell others about the product (optional)"
          className="w-full resize-none rounded-sm border border-border bg-[var(--input)] px-3 py-2 text-sm outline-none focus:border-gold"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        data-tip-side="top"
        data-tip="Publish your rating and comment"
        className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-gold px-5 py-3 text-xs uppercase tracking-[0.2em] text-gold-foreground disabled:opacity-60"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Submit review
      </button>
    </form>
  );
}
