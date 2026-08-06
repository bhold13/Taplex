"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { optimizeImageUpload } from "@/lib/client-image";
import { readApiResponse } from "@/lib/client-response";
import PromoCodeManager from "@/components/admin/promo-code-manager";

const NfcInventoryManager = dynamic(() => import("@/components/admin/nfc-inventory-manager"), {
  ssr: false,
  loading: () => <p className="admin-empty">Loading secure NFC inventory…</p>,
});

type Product = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  inventory: number;
  trackInventory: boolean;
  active: boolean;
  imageAlt: string;
  imageUrl: string | null;
  updatedAt: string;
};

type Order = {
  id: string;
  checkoutSessionId: string;
  status: string;
  amountTotal: number;
  currency: string;
  customerEmail: string | null;
  createdAt: string;
};

type Customer = {
  id: string;
  email: string;
  displayName: string;
  authMethod: string;
  createdAt: string;
  handle: string | null;
  plan: "free" | "pro";
  published: boolean;
  promoCode: string | null;
};

const emptyForm = {
  name: "",
  description: "",
  price: "40.00",
  inventory: "0",
  trackInventory: false,
  active: true,
  imageAlt: "",
};

export default function AdminDashboard({ displayName }: { displayName: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentsReady, setPaymentsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [image, setImage] = useState<File | null>(null);
  const [tab, setTab] = useState<"products" | "orders" | "customers" | "promos" | "nfc">("products");
  const [customerSearch, setCustomerSearch] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productsResponse, ordersResponse, customersResponse] = await Promise.all([
        fetch("/api/admin/products", { headers: { accept: "application/json" } }),
        fetch("/api/admin/orders", { headers: { accept: "application/json" } }),
        fetch("/api/admin/customers", { headers: { accept: "application/json" } }),
      ]);
      if (!productsResponse.ok || !ordersResponse.ok || !customersResponse.ok) throw new Error("Dashboard data could not be loaded.");
      const productData = await productsResponse.json() as { products: Product[]; paymentsConfigured: boolean };
      const orderData = await ordersResponse.json() as { orders: Order[] };
      const customerData = await customersResponse.json() as { customers: Customer[] };
      setProducts(productData.products);
      setPaymentsReady(productData.paymentsConfigured);
      setOrders(orderData.orders);
      setCustomers(customerData.customers);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Dashboard data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDashboard(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description,
      price: (product.priceCents / 100).toFixed(2),
      inventory: String(product.inventory),
      trackInventory: product.trackInventory,
      active: product.active,
      imageAlt: product.imageAlt,
    });
    setImage(null);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setImage(null);
    setDeleteId(null);
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const body = new FormData();
    body.set("name", form.name);
    body.set("description", form.description);
    body.set("price", form.price);
    body.set("inventory", form.inventory);
    body.set("trackInventory", String(form.trackInventory));
    body.set("active", String(form.active));
    body.set("imageAlt", form.imageAlt);
    try {
      if (image) {
        setMessage(image.size > 850 * 1024 ? "Optimizing product photo…" : "Uploading product photo…");
        const optimizedImage = await optimizeImageUpload(image);
        body.set("image", optimizedImage, optimizedImage.name);
      }
      const response = await fetch(editingId ? `/api/admin/products/${editingId}` : "/api/admin/products", {
        method: editingId ? "PUT" : "POST",
        body,
      });
      const data = await readApiResponse<Record<string, never>>(response);
      if (!response.ok) throw new Error(data.error || "Product could not be saved.");
      setMessage(editingId ? "Product updated." : "Product published to your catalog.");
      resetForm();
      await loadDashboard();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Product could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(id: string) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const data = await readApiResponse<Record<string, never>>(response);
      if (!response.ok) throw new Error(data.error || "Product could not be removed.");
      setDeleteId(null);
      setMessage("Product removed.");
      await loadDashboard();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Product could not be removed.");
    } finally {
      setSaving(false);
    }
  }

  const visibleCustomers = customers.filter((customer) => [customer.displayName, customer.email, customer.handle ?? "", customer.promoCode ?? ""].join(" ").toLowerCase().includes(customerSearch.trim().toLowerCase()));

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Link className="brand" href="/" aria-label="TapLex home">
          <span className="brand-mark"><img src="/taplex-logo.webp" alt="" /></span>
          <span className="brand-name">TapLex</span>
        </Link>
        <div className="admin-title"><span>Owner portal</span><b>Commerce dashboard</b></div>
        <div className="admin-account"><span>{displayName}</span><a href="/signout-with-chatgpt?return_to=/">Log out</a></div>
      </header>

      <section className="admin-overview">
        <div>
          <p className="eyebrow"><span /> TapLex commerce</p>
          <h1>Manage what<br />you <em>sell.</em></h1>
        </div>
        <div className="admin-metrics">
          <article><span>Products</span><b>{products.length}</b><small>{products.filter((item) => item.active).length} live</small></article>
          <article><span>Paid orders</span><b>{orders.length}</b><small>Most recent 50</small></article>
          <article><span>Members</span><b>{customers.length}</b><small>{customers.filter((item) => item.plan === "pro").length} Pro</small></article>
          <article className={paymentsReady ? "metric-ready" : "metric-action"}><span>Payments</span><b>{paymentsReady ? "Live" : "Setup"}</b><small>{paymentsReady ? "Stripe connected" : "Stripe keys needed"}</small></article>
        </div>
      </section>

      <nav className="admin-tabs" aria-label="Dashboard sections">
        <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>Products</button>
        <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>Orders <span>{orders.length}</span></button>
        <button className={tab === "customers" ? "active" : ""} onClick={() => setTab("customers")}>Members <span>{customers.length}</span></button>
        <button className={tab === "promos" ? "active" : ""} onClick={() => setTab("promos")}>Pro Codes</button>
        <button className={tab === "nfc" ? "active" : ""} onClick={() => setTab("nfc")}>NFC Inventory</button>
        <Link href="/order" target="_blank">View storefront ↗</Link>
      </nav>

      {error && <div className="admin-alert error" role="alert">{error}</div>}
      {message && <div className="admin-alert success" role="status">{message}</div>}

      {tab === "products" ? (
        <div className="admin-product-layout">
          <form className="product-editor" onSubmit={saveProduct}>
            <div className="editor-heading"><span>{editingId ? "Edit product" : "New product"}</span><b>{editingId ? "Update listing" : "Add to catalog"}</b></div>
            <label>Product name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={80} placeholder="TapLex NFC Wristband" /></label>
            <label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={600} placeholder="What the customer receives" /></label>
            <div className="editor-row">
              <label>Price (USD)<div className="money-input"><span>$</span><input required type="number" min="1" max="10000" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></div></label>
              <label>Inventory<input required type="number" min="0" max="100000" step="1" value={form.inventory} onChange={(event) => setForm({ ...form, inventory: event.target.value })} /></label>
            </div>
            <label>Product image <small>JPG, PNG, or WebP · large photos are optimized automatically</small><input className="file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] ?? null)} /></label>
            <label>Image description <small>For accessibility</small><input value={form.imageAlt} onChange={(event) => setForm({ ...form, imageAlt: event.target.value })} maxLength={120} placeholder="Black and gold TapLex wristband" /></label>
            <div className="editor-toggles">
              <label><input type="checkbox" checked={form.trackInventory} onChange={(event) => setForm({ ...form, trackInventory: event.target.checked })} /><span><b>Track inventory</b><small>Hide when stock reaches zero</small></span></label>
              <label><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /><span><b>Visible in store</b><small>Customers can purchase it</small></span></label>
            </div>
            <div className="editor-actions">
              <button className="button button-gold" type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Update Product" : "Publish Product"}</button>
              {editingId && <button className="cancel-edit" type="button" onClick={resetForm}>Cancel edit</button>}
            </div>
          </form>

          <section className="product-manager" aria-label="Product catalog">
            <div className="manager-heading"><span>Your catalog</span><b>{products.length} products</b></div>
            {loading ? <p className="admin-empty">Loading your products…</p> : products.length === 0 ? <p className="admin-empty">Your catalog is empty. Add your first product using the form.</p> : (
              <div className="admin-product-list">
                {products.map((product) => (
                  <article key={product.id} className={!product.active ? "inactive" : ""}>
                    <div className="admin-product-image">{product.imageUrl ? <img src={product.imageUrl} alt={product.imageAlt || product.name} /> : <span>T</span>}</div>
                    <div className="admin-product-info"><span>{product.active ? "Live" : "Hidden"}</span><h2>{product.name}</h2><p>{product.description || "No description added."}</p><div><b>{formatMoney(product.priceCents, "usd")}</b><small>{product.trackInventory ? `${product.inventory} in stock` : "Inventory not tracked"}</small></div></div>
                    <div className="admin-product-actions">
                      <button type="button" onClick={() => startEdit(product)}>Edit</button>
                      {deleteId === product.id ? <div className="delete-confirm"><span>Remove?</span><button type="button" onClick={() => void removeProduct(product.id)} disabled={saving}>Yes</button><button type="button" onClick={() => setDeleteId(null)}>No</button></div> : <button className="delete-button" type="button" onClick={() => setDeleteId(product.id)}>Delete</button>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : tab === "orders" ? (
        <section className="orders-panel">
          <div className="manager-heading"><span>Paid orders</span><b>{orders.length} recent</b></div>
          {loading ? <p className="admin-empty">Loading orders…</p> : orders.length === 0 ? <p className="admin-empty">Paid Stripe orders will appear here after the payment connection is activated.</p> : (
            <div className="orders-list">
              {orders.map((order) => (
                <article key={order.id}><div><span>{order.status}</span><b>{order.customerEmail || "Customer email unavailable"}</b></div><strong>{formatMoney(order.amountTotal, order.currency)}</strong><small>{new Date(order.createdAt).toLocaleString()}</small></article>
              ))}
            </div>
          )}
        </section>
      ) : tab === "customers" ? <section className="customers-panel">
        <div className="customers-heading"><div><span>TapLex accounts</span><b>{customers.length} members</b></div><label><span>Search members</span><input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Name, email, or handle" /></label></div>
        {loading ? <p className="admin-empty">Loading members…</p> : <div className="customers-list">
          {visibleCustomers.map((customer) => <article key={customer.id}>
            <span className="customer-avatar">{customer.displayName.trim().charAt(0).toUpperCase() || "T"}</span>
            <div className="customer-identity"><b>{customer.displayName}</b><a href={`mailto:${customer.email}`}>{customer.email}</a><small>{customer.handle ? `taplex.co/p/${customer.handle}` : "Profile not created yet"}</small></div>
            <div className="customer-membership"><span className={customer.plan === "pro" ? "pro" : "free"}>{customer.plan}</span><small>{customer.promoCode ? `Code: ${customer.promoCode}` : "No promo code"}</small></div>
            <div className="customer-status"><b>{customer.published ? "Published" : "Draft"}</b><small>{customer.authMethod} · {new Date(customer.createdAt).toLocaleDateString()}</small></div>
          </article>)}
          {!visibleCustomers.length ? <p className="admin-empty">{customers.length ? "No members match that search." : "New TapLex signups will appear here."}</p> : null}
        </div>}
      </section> : tab === "promos" ? <PromoCodeManager /> : <NfcInventoryManager />}
    </main>
  );
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}
