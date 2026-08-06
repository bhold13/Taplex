"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const INSTAGRAM_URL = "https://www.instagram.com/bholddageneral/";

type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  inventory: number;
  trackInventory: boolean;
  imageUrl: string | null;
  imageAlt: string;
};

export default function OrderPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [paymentsReady, setPaymentsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/products", { headers: { accept: "application/json" } })
      .then(async (response) => {
        const data = await response.json() as { products?: Product[]; paymentsConfigured?: boolean; error?: string };
        if (!response.ok) throw new Error(data.error || "Catalog unavailable.");
        return data;
      })
      .then((data) => {
        if (!active) return;
        setProducts(data.products ?? []);
        setPaymentsReady(Boolean(data.paymentsConfigured));
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Catalog unavailable.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const cartItems = useMemo(() => products.flatMap((product) => {
    const quantity = cart[product.id] ?? 0;
    return quantity > 0 ? [{ product, quantity }] : [];
  }), [cart, products]);

  const total = cartItems.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);

  function changeQuantity(product: Product, change: number) {
    setError("");
    setCart((current) => {
      const max = product.trackInventory ? Math.min(10, product.inventory) : 10;
      const next = Math.max(0, Math.min(max, (current[product.id] ?? 0) + change));
      if (next === 0) {
        const updated = { ...current };
        delete updated[product.id];
        return updated;
      }
      return { ...current, [product.id]: next };
    });
  }

  async function beginCheckout() {
    if (!paymentsReady || cartItems.length < 1) return;
    setCheckingOut(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ items: cartItems.map(({ product, quantity }) => ({ productId: product.id, quantity })) }),
      });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Checkout could not be started.");

      const checkoutUrl = new URL(data.url);
      if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "checkout.stripe.com") throw new Error("Invalid checkout destination.");
      window.location.assign(checkoutUrl.toString());
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not be started.");
      setCheckingOut(false);
    }
  }

  return (
    <main className="store-shell">
      <header className="signup-header">
        <Link className="brand" href="/" aria-label="TapLex home">
          <span className="brand-mark"><img src="/taplex-logo.webp" alt="" /></span>
          <span className="brand-name">TapLex</span>
        </Link>
        <div className="order-secure-note"><span>●</span> Secure storefront</div>
        <Link className="signup-exit" href="/">Back to site</Link>
      </header>

      <section className="store-hero">
        <div>
          <p className="eyebrow"><span /> TapLex store</p>
          <h1>Choose your gear.<br /><em>Own the connection.</em></h1>
        </div>
        <div className="store-payment-note"><b>Five signature colors · $50 each</b><p>Every official wristband includes your permanent TapLex profile, NFC tap access, printed QR backup, and secure checkout by Stripe.</p></div>
      </section>

      <div className="store-layout">
        <section className="store-catalog" aria-label="TapLex products">
          <div className="catalog-heading"><span>Available products</span><b>{products.length} options</b></div>
          {loading ? <div className="store-state">Loading TapLex products…</div> : error && products.length === 0 ? <div className="store-state error">{error}</div> : products.length === 0 ? (
            <div className="store-state"><h2>New products are being added.</h2><p>Message TapLex to reserve your NFC product today.</p><a className="button button-gold" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Message TapLex <span>↗</span></a></div>
          ) : (
            <div className="store-product-grid">
              {products.map((product, index) => {
                const quantity = cart[product.id] ?? 0;
                const isSignatureWristband = product.slug.startsWith("taplex-nfc-wristband-");
                return (
                  <article key={product.id} className="store-product-card">
                    <div className="store-product-image">{product.imageUrl ? <img src={product.imageUrl} alt={product.imageAlt || product.name} loading={index === 0 ? "eager" : "lazy"} decoding="async" /> : <div className="store-product-placeholder"><span>T</span><i>)))</i></div>}</div>
                    <div className="store-product-copy">
                      <span>{product.trackInventory ? `${product.inventory} available` : isSignatureWristband ? "Official TapLex color" : "Made to connect"}</span>
                      <h2>{product.name}</h2>
                      <p>{product.description || "Premium NFC networking with a personal TapLex profile."}</p>
                      <div className="store-product-buy">
                        <b>{formatMoney(product.priceCents, product.currency)}</b>
                        {quantity > 0 ? (
                          <div className="quantity-control" aria-label={`${product.name} quantity`}><button type="button" onClick={() => changeQuantity(product, -1)} aria-label={`Remove one ${product.name}`}>−</button><span>{quantity}</span><button type="button" onClick={() => changeQuantity(product, 1)} aria-label={`Add another ${product.name}`}>+</button></div>
                        ) : <button type="button" className="add-product" onClick={() => changeQuantity(product, 1)}>Add to order <span>＋</span></button>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="store-cart" aria-live="polite">
          <div className="summary-topline"><span>Your order</span><b>{cartItems.reduce((sum, item) => sum + item.quantity, 0)} items</b></div>
          {cartItems.length === 0 ? <div className="cart-empty"><span>01</span><h2>Your cart is ready.</h2><p>Add a TapLex product to begin secure checkout.</p></div> : (
            <div className="cart-items">
              {cartItems.map(({ product, quantity }) => <div key={product.id}><span>{quantity}×</span><p>{product.name}</p><b>{formatMoney(product.priceCents * quantity, product.currency)}</b></div>)}
            </div>
          )}
          <div className="cart-total"><span>Subtotal</span><b>{formatMoney(total, "usd")}</b></div>
          <p className="cart-shipping">Delivery address is collected securely during checkout. Current checkout supports U.S. delivery.</p>
          {error && products.length > 0 && <div className="checkout-error" role="alert">{error}</div>}
          <button className="button button-gold checkout-button" type="button" onClick={() => void beginCheckout()} disabled={!paymentsReady || cartItems.length === 0 || checkingOut}>{checkingOut ? "Opening Checkout…" : paymentsReady ? "Secure Checkout" : "Card Checkout Activating"}<span>→</span></button>
          <div className="payment-methods"><span>Dynamic payment methods</span><b>Cards · Apple Pay · Google Pay · Link</b><small>Availability depends on the customer’s device, location, and the methods enabled in Stripe.</small></div>
          <a className="manual-order-link" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Need help? Message TapLex ↗</a>
        </aside>
      </div>

      <section className="store-profile-cta"><p className="eyebrow"><span /> Included with your product</p><h2>Make the profile<br /><em>look like you.</em></h2><p>Choose from eight TapLex skins and build your digital identity before activation.</p><Link className="button button-outline" href="/signup">Preview Profile Skins <span>→</span></Link></section>
    </main>
  );
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}
