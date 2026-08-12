import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { X, Trash2, Plus, Loader2, ImagePlus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  productVariantsQuery,
  type Category,
  type Product,
} from "@/lib/queries";
import { formatKES } from "@/lib/site";
import { TableDescriptionEditor } from "./admin-table-description";

export function EditProductDialog({
  product,
  categories,
  onClose,
}: {
  product: Product;
  categories: Pick<Category, "id" | "name">[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState<number | "">(product.price_kes);
  const [categoryId, setCategoryId] = useState(product.category_id ?? "");
  const [description, setDescription] = useState(product.description ?? "");
  const [tableDescription, setTableDescription] = useState<{ key: string; value: string }[]>(
    product.table_description ?? [],
  );
  const [featured, setFeatured] = useState(product.featured);
  const [stockQty, setStockQty] = useState<number | "">(product.stock_qty);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newVideo, setNewVideo] = useState<File | null>(null);
  const [gender, setGender] = useState<Product["gender"]>(product.gender ?? "unisex");
  const [isLimitedOffer, setIsLimitedOffer] = useState(product.is_limited_offer);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (typeof price !== "number" || price <= 0) {
      toast.error("Enter a valid price.");
      return;
    }
    setSaving(true);
    try {
      const images = [...(product.images ?? [])];
      for (const file of newImages) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("product-images")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (error) throw error;
        images.push(path);
      }

      let videoPath = product.video_url;
      if (newVideo) {
        if (newVideo.size > 50 * 1024 * 1024) throw new Error("Video is larger than 50MB.");
        const ext = newVideo.name.split(".").pop() || "mp4";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("product-videos")
          .upload(path, newVideo, { cacheControl: "3600", upsert: false });
        if (error) throw error;
        videoPath = path;
      }

      const { error } = await supabase
        .from("products")
        .update({
          name: name.trim(),
          price_kes: price,
          category_id: categoryId || null,
          description: description.trim() || null,
          table_description: tableDescription,
          featured,
          gender,
          is_limited_offer: isLimitedOffer,
          stock_qty: typeof stockQty === "number" ? Math.max(0, stockQty) : 0,
          images,
          image_url: images[0] ?? null,
          video_url: videoPath,
        })
        .eq("id", product.id);
      if (error) throw error;

      toast.success("Product updated.");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product", product.slug] });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeImage(path: string) {
    const images = (product.images ?? []).filter((p) => p !== path);
    const { error } = await supabase
      .from("products")
      .update({ images, image_url: images[0] ?? null })
      .eq("id", product.id);
    if (error) toast.error(error.message);
    else {
      await supabase.storage.from("product-images").remove([path]);
      toast.success("Image removed.");
      qc.invalidateQueries({ queryKey: ["products"] });
    }
  }

  async function makeMain(path: string) {
    const rest = (product.images ?? []).filter((p) => p !== path);
    const { error } = await supabase
      .from("products")
      .update({ images: [path, ...rest], image_url: path })
      .eq("id", product.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Main image updated.");
      qc.invalidateQueries({ queryKey: ["products"] });
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="my-8 w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Edit product</h2>
            <button
              onClick={onClose}
              data-tip="Close without saving"
              className="text-muted-foreground hover:text-gold"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={save} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Name
                </span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Price (KES)
                </span>
                <input
                  required
                  type="number"
                  min={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : "")}
                  className="input"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Category
                </span>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="input"
                >
                  <option value="">Uncategorised</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Stock quantity
                </span>
                <input
                  type="number"
                  min={0}
                  value={stockQty}
                  onChange={(e) =>
                    setStockQty(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="input"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Gender
                </span>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Product["gender"])}
                  className="input"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="unisex">Unisex</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Description
              </span>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input resize-none"
              />
            </label>

            <TableDescriptionEditor value={tableDescription} onChange={setTableDescription} />

            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Current images
              </p>
              <div className="flex flex-wrap gap-2">
                {(product.images ?? []).map((path, idx) => (
                  <ExistingImage
                    key={path}
                    path={path}
                    isMain={idx === 0}
                    onMakeMain={() => makeMain(path)}
                    onRemove={() => removeImage(path)}
                  />
                ))}
                {(product.images ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No images yet.</p>
                )}
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <ImagePlus className="h-3.5 w-3.5" /> Add more images
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setNewImages(Array.from(e.target.files ?? []))}
                className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-sm file:border-0 file:bg-gold file:px-3 file:py-2 file:text-xs file:uppercase file:tracking-widest file:text-gold-foreground"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Replace video (optional)
              </span>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setNewVideo(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-sm file:border-0 file:bg-gold file:px-3 file:py-2 file:text-xs file:uppercase file:tracking-widest file:text-gold-foreground"
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
              />
              Feature on home page
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isLimitedOffer}
                onChange={(e) => setIsLimitedOffer(e.target.checked)}
              />
              Limited time offer
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                data-tip-side="top"
                data-tip="Save your changes to this product"
                className="flex-1 rounded-full bg-gold px-4 py-3 text-xs uppercase tracking-[0.25em] text-gold-foreground disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-border px-5 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-gold"
              >
                Cancel
              </button>
            </div>
          </form>

          <VariantManager productId={product.id} basePrice={product.price_kes} />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ExistingImage({
  path,
  isMain,
  onMakeMain,
  onRemove,
}: {
  path: string;
  isMain: boolean;
  onMakeMain: () => void;
  onRemove: () => void;
}) {
  const { data: url } = useQuery({
    queryKey: ["signed-url", "product-images", path],
    queryFn: async () => {
      const { data } = await supabase.storage
        .from("product-images")
        .createSignedUrl(path, 3600);
      return data?.signedUrl ?? null;
    },
  });
  return (
    <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-border bg-muted">
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      {isMain && (
        <span className="absolute left-1 top-1 rounded-full bg-gold px-1.5 text-[9px] uppercase text-gold-foreground">
          Main
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 flex justify-between bg-background/80 px-1 py-0.5">
        {!isMain && (
          <button
            type="button"
            onClick={onMakeMain}
            data-tip="Use as the main image"
            className="text-[9px] uppercase text-muted-foreground hover:text-gold"
          >
            Main
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          data-tip="Remove this image"
          className="ml-auto text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function VariantManager({ productId, basePrice }: { productId: string; basePrice: number }) {
  const qc = useQueryClient();
  const { data: variants = [], isLoading } = useQuery(productVariantsQuery(productId));
  const [label, setLabel] = useState("");
  const [price, setPrice] = useState<number | "">(basePrice);
  const [stock, setStock] = useState<number | "">(1);
  const [busy, setBusy] = useState(false);

  async function addVariant(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || typeof price !== "number" || price <= 0) {
      toast.error("Enter an option name and price.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("product_variants").insert({
      product_id: productId,
      label: label.trim(),
      price_kes: price,
      stock_qty: typeof stock === "number" ? Math.max(0, stock) : 0,
      sort_order: variants.length,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Option added.");
      setLabel("");
      setStock(1);
      qc.invalidateQueries({ queryKey: ["variants", productId] });
    }
  }

  async function updateStock(id: string, qty: number) {
    const { error } = await supabase
      .from("product_variants")
      .update({ stock_qty: Math.max(0, Math.floor(qty)) })
      .eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["variants", productId] });
  }

  async function removeVariant(id: string) {
    const { error } = await supabase.from("product_variants").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Option removed.");
      qc.invalidateQueries({ queryKey: ["variants", productId] });
    }
  }

  return (
    <div className="mt-8 border-t border-border pt-6">
      <h3 className="font-serif text-xl">Options / variants</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Add sizes, colours or bundles. Each option has its own price and stock. Leave empty to sell
        the product as a single item.
      </p>

      {isLoading ? (
        <Loader2 className="mt-4 h-4 w-4 animate-spin text-gold" />
      ) : (
        variants.length > 0 && (
          <ul className="mt-4 space-y-2">
            {variants.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 px-3 py-2 text-sm"
              >
                <span className="flex-1 truncate">{v.label}</span>
                <span className="text-gold">{formatKES(v.price_kes)}</span>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  Qty
                  <input
                    type="number"
                    min={0}
                    defaultValue={v.stock_qty}
                    data-tip="Stock available for this option"
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isNaN(n) && n !== v.stock_qty) updateStock(v.id, n);
                    }}
                    className="w-16 rounded-md border border-border bg-input px-2 py-0.5 text-xs text-foreground"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeVariant(v.id)}
                  data-tip="Delete this option"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )
      )}

      <form onSubmit={addVariant} className="mt-4 flex flex-wrap items-end gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. 42mm Silver"
          data-tip="Name of this option as shoppers will see it"
          className="input flex-1 min-w-[140px]"
        />
        <input
          type="number"
          min={1}
          value={price}
          onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : "")}
          placeholder="Price"
          className="input w-24"
        />
        <button
          type="submit"
          disabled={busy}
          className="h-10 rounded-lg bg-gold px-4 text-xs uppercase tracking-widest text-gold-foreground"
        >
          {busy ? "Adding…" : "Add"}
        </button>
      </form>
    </div>
  );
}
