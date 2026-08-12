import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Plus, LogOut, Star, StarOff, Loader2, Tag, Package, Boxes, Pencil, Download } from "lucide-react";
import { ordersQuery, ORDER_STATUSES } from "@/lib/orders";
import { downloadOrdersCsv } from "@/lib/export-csv";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductImage } from "@/components/product-image";
import { EditProductDialog } from "@/components/admin-product-editor";
import { AdminAnalytics } from "@/components/admin-analytics";
import { CouponManager, DeliveryZoneManager } from "@/components/admin-marketing";
import { GiftFinderBudgetManager } from "@/components/admin-gift-finder";
import { TableDescriptionEditor } from "@/components/admin-table-description";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  categoriesQuery,
  isAdminQuery,
  productsQuery,
  type Product,
} from "@/lib/queries";
import { formatKES } from "@/lib/site";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const userId = (context as { user?: { id: string } }).user?.id;
    if (!userId) throw redirect({ to: "/" });
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error || !data) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Admin — Phenomenal Products KE" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});


function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: isAdmin, isLoading: roleLoading } = useQuery(isAdminQuery(user?.id ?? null));
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: products = [], isLoading } = useQuery(productsQuery());

  useEffect(() => {
    if (!roleLoading && isAdmin === false) {
      toast.error("Admins only.");
      navigate({ to: "/", replace: true });
    }
  }, [roleLoading, isAdmin, navigate]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-gold" />
        </div>
      </div>
    );
  }

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-10">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-gold">Admin</p>
            <h1 className="mt-2 font-serif text-3xl md:text-4xl">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Signed in as {user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-gold"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 pb-16">
        <Tabs defaultValue="overview">
          <TabsList className="mb-8 flex-wrap">
            <TabsTrigger value="overview" data-tip="Sales stats and trends">Overview</TabsTrigger>
            <TabsTrigger value="catalogue" data-tip="Add and manage products and categories">Catalogue</TabsTrigger>
            <TabsTrigger value="orders" data-tip="Track and update customer orders">Orders</TabsTrigger>
            <TabsTrigger value="marketing" data-tip="Coupons and delivery zones">Marketing</TabsTrigger>
            <TabsTrigger value="giftfinder" data-tip="Manage Gift Finder budget ranges">Gift Finder</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AdminAnalytics />
          </TabsContent>

          <TabsContent value="catalogue">
            <div className="grid gap-10 lg:grid-cols-[380px_1fr]">
              <div className="space-y-8">
                <CategoryManager categories={categories} />
                <NewProductForm categories={categories} />
              </div>
              <ProductList products={products} categories={categories} isLoading={isLoading} />
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <OrdersPanel />
          </TabsContent>

          <TabsContent value="marketing">
            <div className="grid gap-8 lg:grid-cols-2">
              <CouponManager />
                <DeliveryZoneManager />
              </div>
            </TabsContent>

            <TabsContent value="giftfinder">
              <div className="max-w-xl">
                <GiftFinderBudgetManager />
              </div>
            </TabsContent>
        </Tabs>
      </div>

      <SiteFooter />
    </div>
  );
}

function NewProductForm({
  categories,
}: {
  categories: { id: string; name: string; slug: string }[];
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [tableDescription, setTableDescription] = useState<{ key: string; value: string }[]>([]);
  const [featured, setFeatured] = useState(false);
  const [stockQty, setStockQty] = useState<number | "">(1);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [gender, setGender] = useState<Product["gender"]>("unisex");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!categoryId && categories[0]) setCategoryId(categories[0].id);
  }, [categories, categoryId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (imageFiles.length === 0) {
      toast.error("Please add at least one product image.");
      return;
    }
    if (typeof price !== "number" || price <= 0) {
      toast.error("Enter a valid price.");
      return;
    }
    if (videoFile && videoFile.size > 50 * 1024 * 1024) {
      toast.error("Video is larger than 50MB. Please upload a shorter clip.");
      return;
    }
    setLoading(true);
    try {
      const uploadedPaths: string[] = [];
      for (const file of imageFiles) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("product-images")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        uploadedPaths.push(path);
      }

      let videoPath: string | null = null;
      if (videoFile) {
        const ext = videoFile.name.split(".").pop() || "mp4";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: vErr } = await supabase.storage
          .from("product-videos")
          .upload(path, videoFile, { cacheControl: "3600", upsert: false });
        if (vErr) throw vErr;
        videoPath = path;
      }

      const baseSlug = slugify(name);
      const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

      const { error } = await supabase.from("products").insert({
        name,
        slug,
        price_kes: price,
        category_id: categoryId || null,
        description: description || null,
        table_description: tableDescription,
        featured,
        gender,
        stock_qty: typeof stockQty === "number" ? Math.max(0, stockQty) : 0,
        image_url: uploadedPaths[0],
        images: uploadedPaths,
        video_url: videoPath,
      });
      if (error) throw error;

      toast.success("Product added.");
      setName("");
      setPrice("");
      setGender("unisex");
      setDescription("");
      setTableDescription([]);
      setFeatured(false);
      setStockQty(1);
      setImageFiles([]);
      setVideoFile(null);
      (e.target as HTMLFormElement).reset();
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="h-fit space-y-4 rounded-sm border border-border bg-card p-6"
    >
      <div className="flex items-center gap-2">
        <Plus className="h-4 w-4 text-gold" />
        <h2 className="font-serif text-xl">Add product</h2>
      </div>

      <Field label="Name">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Price (KES)">
        <input
          required
          type="number"
          min={1}
          value={price}
          onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : "")}
          className="input"
        />
      </Field>
      <Field label="Category">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="input"
          required
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Stock quantity">
        <input
          required
          type="number"
          min={0}
          value={stockQty}
          onChange={(e) => setStockQty(e.target.value === "" ? "" : Number(e.target.value))}
          className="input"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Shows as sold out automatically when this reaches 0.
        </p>
      </Field>
      <Field label="Gender">
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value as Product["gender"])}
          className="input"
          required
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="unisex">Unisex</option>
        </select>
      </Field>
      <Field label="Description (optional)">
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input resize-none"
        />
      </Field>
      
      <TableDescriptionEditor value={tableDescription} onChange={setTableDescription} />

      <Field label="Images (first is main; select multiple)">
        <input
          type="file"
          accept="image/*"
          multiple
          required
          onChange={(e) => setImageFiles(Array.from(e.target.files ?? []))}
          className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-sm file:border-0 file:bg-gold file:px-3 file:py-2 file:text-xs file:uppercase file:tracking-widest file:text-gold-foreground"
        />
        {imageFiles.length > 0 && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {imageFiles.length} image{imageFiles.length === 1 ? "" : "s"} selected
          </p>
        )}
      </Field>
      <Field label="Video (optional, max 50MB)">
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-sm file:border-0 file:bg-gold file:px-3 file:py-2 file:text-xs file:uppercase file:tracking-widest file:text-gold-foreground"
        />
        {videoFile && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {videoFile.name} · {(videoFile.size / 1024 / 1024).toFixed(1)}MB
          </p>
        )}
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={featured}
          onChange={(e) => setFeatured(e.target.checked)}
        />
        Feature on home page
      </label>

      <button
        type="submit"
        disabled={loading}
        data-tip-side="top"
        data-tip="Save this product and publish it to the shop"
        className="w-full rounded-sm bg-gold px-4 py-3 text-xs uppercase tracking-[0.25em] text-gold-foreground disabled:opacity-60"
      >
        {loading ? "Uploading…" : "Add product"}
      </button>

      <style>{`
        .input {
          width: 100%;
          border-radius: 2px;
          border: 1px solid var(--border);
          background: var(--input);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus { border-color: var(--gold); }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function ProductList({
  products,
  categories,
  isLoading,
}: {
  products: Product[];
  categories: { id: string; name: string; slug: string }[];
  isLoading: boolean;
}) {
  const qc = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const editing = products.find((p) => p.id === editId) ?? null;

  async function deleteProduct(p: Product) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    try {
      if (p.image_url) {
        await supabase.storage.from("product-images").remove([p.image_url]);
      }
      const { error } = await supabase.from("products").delete().eq("id", p.id);
      if (error) throw error;
      toast.success("Deleted.");
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function toggleFeatured(p: Product) {
    const { error } = await supabase
      .from("products")
      .update({ featured: !p.featured })
      .eq("id", p.id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function setStock(p: Product, qty: number) {
    const next = Math.max(0, Math.floor(qty));
    const { error } = await supabase
      .from("products")
      .update({ stock_qty: next })
      .eq("id", p.id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["products"] });
  }

  const sorted = useMemo(() => products, [products]);

  return (
    <div>
      <h2 className="mb-4 font-serif text-xl">Catalogue ({products.length})</h2>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : sorted.length === 0 ? (
        <div className="rounded-sm border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">No products yet — add your first on the left.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-4 rounded-sm border border-border bg-card p-3"
            >
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-sm bg-muted">
                <ProductImage path={p.image_url} alt={p.name} className="h-full w-full" />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  to="/product/$slug"
                  params={{ slug: p.slug }}
                  className="truncate font-serif text-lg hover:text-gold"
                >
                  {p.name}
                </Link>
                <p className="text-sm text-gold">{formatKES(p.price_kes)}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  {p.featured && <span className="text-gold">Featured</span>}
                  <span className={p.in_stock ? "text-success" : "text-hot"}>
                    {p.in_stock ? "In stock" : "Sold out"}
                  </span>
                  <label className="flex items-center gap-1 normal-case tracking-normal">
                    <Boxes className="h-3 w-3" /> Qty
                    <input
                      type="number"
                      min={0}
                      defaultValue={p.stock_qty}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isNaN(v) && v !== p.stock_qty) setStock(p, v);
                      }}
                      className="w-16 rounded-md border border-border bg-input px-2 py-0.5 text-xs text-foreground"
                    />
                  </label>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditId(p.id)}
                  data-tip="Edit product details"
                  className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-gold"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteProduct(p)}
                  data-tip="Remove product from shop"
                  className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-hot"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <EditProductDialog
          product={editing}
          categories={categories}
          onClose={() => setEditId(null)}
        />
      )}
    </div>
  );
}

function CategoryManager({ categories }: { categories: any[] }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const slug = slugify(name);
    const { error } = await supabase.from("categories").insert({
      name: name.trim(),
      slug,
      description: description.trim() || null,
      sort_order: categories.length,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Category added.");
      setName("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["categories"] });
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete category? Products in this category will become uncategorised.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["categories"] });
  }

  return (
    <div className="rounded-sm border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-gold" />
        <h2 className="font-serif text-xl">Categories</h2>
      </div>

      <form onSubmit={addCategory} className="mt-4 space-y-3">
        <input
          required
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
        />
        <input
          placeholder="Short description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-sm bg-gold px-4 py-2 text-xs uppercase tracking-widest text-gold-foreground disabled:opacity-60"
        >
          Add category
        </button>
      </form>

      <ul className="mt-6 space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between text-sm">
            <span>{c.name}</span>
            <button
              onClick={() => deleteCategory(c.id)}
              className="text-muted-foreground hover:text-hot"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OrdersPanel() {
  const { data: orders = [], isLoading } = useQuery(ordersQuery);
  const qc = useQueryClient();

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Order status updated.");
      qc.invalidateQueries({ queryKey: ["orders"] });
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading orders…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl">Recent Orders</h2>
        <button
          onClick={() => downloadOrdersCsv(orders)}
          className="inline-flex items-center gap-2 rounded-sm border border-border px-3 py-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-gold transition"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Ref</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-muted/30 transition">
                <td className="px-4 py-4 font-mono text-[11px]">{order.reference}</td>
                <td className="px-4 py-4">
                  <div className="font-medium">{order.customer_name}</div>
                  <div className="text-[11px] text-muted-foreground">{order.phone}</div>
                </td>
                <td className="px-4 py-4">
                  <ul className="text-[11px] text-muted-foreground">
                    {order.order_items.map((item: any, i: number) => (
                      <li key={i}>
                        {item.qty} × {item.product_name}
                        {item.variant_label && ` (${item.variant_label})`}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-4 py-4 font-medium text-gold">
                  {formatKES(order.total_kes)}
                </td>
                <td className="px-4 py-4">
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    className="rounded-sm border border-border bg-background px-2 py-1 text-[11px] uppercase tracking-wider outline-none focus:border-gold"
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-4 text-[11px] text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
