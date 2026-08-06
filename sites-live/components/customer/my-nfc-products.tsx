"use client";

import { FormEvent, useEffect, useState } from "react";
import { readApiResponse } from "@/lib/client-response";

type Product = {
  id: string;
  serial_number: string;
  status: string;
  tap_count: number;
  last_tapped_at: string | null;
  product_type: string;
  color: string;
  profile_handle: string | null;
};
type OwnerProfile = { id: string; handle: string; displayName: string; published: boolean };

export default function MyNfcProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [profiles, setProfiles] = useState<OwnerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [disconnectProduct, setDisconnectProduct] = useState<Product | null>(null);
  const [disconnectConfirmation, setDisconnectConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/profile/tags", { cache: "no-store" });
      const data = await readApiResponse<{ products?: Product[]; profiles?: OwnerProfile[] }>(response);
      if (!response.ok) throw new Error(data.error);
      setProducts(data.products || []);
      setProfiles(data.profiles || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Products could not be loaded.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/profile/tags", { cache: "no-store" });
        const data = await readApiResponse<{ products?: Product[]; profiles?: OwnerProfile[] }>(response);
        if (!response.ok) throw new Error(data.error);
        if (active) { setProducts(data.products || []); setProfiles(data.profiles || []); }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Products could not be loaded.");
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  async function transfer(event: FormEvent<HTMLFormElement>, product: Product) {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/profile/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "transfer", unitId: product.id, recipientEmail: form.get("recipientEmail") }) });
      const data = await readApiResponse<{ message?: string }>(response);
      if (!response.ok) throw new Error(data.error);
      setMessage(data.message || "Transfer sent."); setTransferId(null); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Transfer could not be started."); }
    finally { setBusy(false); }
  }

  async function connectProfile(product: Product, profileId: string) {
    setError(""); setMessage(""); setBusy(true);
    try {
      const response = await fetch("/api/profile/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "connect_profile", unitId: product.id, profileId }) });
      const data = await readApiResponse<{ handle?: string }>(response);
      if (!response.ok) throw new Error(data.error);
      setMessage(`Product connected to @${data.handle}.`); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Connected profile could not be changed."); }
    finally { setBusy(false); }
  }

  async function disconnectTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!disconnectProduct || disconnectConfirmation !== "DISCONNECT") return;
    setError(""); setMessage(""); setBusy(true);
    try {
      const response = await fetch("/api/profile/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", unitId: disconnectProduct.id, confirmation: disconnectConfirmation }),
      });
      const data = await readApiResponse<Record<string, never>>(response);
      if (!response.ok) throw new Error(data.error || "Tag could not be disconnected.");
      setDisconnectProduct(null); setDisconnectConfirmation("");
      setMessage("Tag disconnected. Its NFC/QR link is ready to be claimed again.");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Tag could not be disconnected."); }
    finally { setBusy(false); }
  }

  if (!loading && !products.length && !error && !message) return null;
  return <>
    <section className="editor-panel customer-nfc-panel" id="my-nfc">
      <div className="editor-panel-heading"><div><h2>My NFC products</h2><p>Your permanent TapLex links, tap totals, and protected ownership.</p></div><span>TAP-TO-CLAIM</span></div>
      {loading ? <p>Loading your products…</p> : null}
      {error ? <p className="module-error" role="alert">{error}</p> : null}
      {message ? <p className="module-success" role="status">{message}</p> : null}
      <div className="customer-nfc-list">{products.map((product) => <article key={product.id}>
        <span className="customer-nfc-mark">⌁</span>
        <div><small>{product.color} {product.product_type}</small><b>{product.serial_number}</b><span>{product.status} · {product.tap_count} privacy-safe tap{product.tap_count === 1 ? "" : "s"}</span>
          {product.status === "active" && profiles.length ? <label className="customer-nfc-profile"><span>Connected profile</span><select value={profiles.find((profile) => profile.handle === product.profile_handle)?.id || profiles[0]?.id || ""} onChange={(event) => void connectProfile(product, event.target.value)} disabled={busy}>{profiles.map((profile) => <option key={profile.id} value={profile.id}>@{profile.handle}</option>)}</select></label> : null}
        </div>
        {product.profile_handle ? <a href={`/p/${product.profile_handle}`} target="_blank">Open ↗</a> : null}
        {product.status === "active" ? <button type="button" onClick={() => setTransferId(transferId === product.id ? null : product.id)} disabled={busy}>Transfer</button> : null}
        <button type="button" className="customer-nfc-disconnect" onClick={() => { setDisconnectProduct(product); setDisconnectConfirmation(""); setError(""); }} disabled={busy}>Disconnect Tag</button>
        {transferId === product.id ? <form onSubmit={(event) => void transfer(event, product)}><label>Recipient email<input name="recipientEmail" type="email" required placeholder="newowner@example.com" /></label><button type="submit" disabled={busy}>Send secure invitation</button><small>They must authenticate with this email and accept. Until then, you remain the owner.</small></form> : null}
      </article>)}</div>
    </section>
    {disconnectProduct ? <div className="taplex-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setDisconnectProduct(null); }}>
      <section className="taplex-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="disconnect-tag-title">
        <button className="taplex-modal-close" type="button" aria-label="Close disconnect dialog" onClick={() => setDisconnectProduct(null)} disabled={busy}>×</button>
        <span className="taplex-modal-eyebrow">TAG OWNERSHIP</span>
        <h2 id="disconnect-tag-title">Disconnect this tag?</h2>
        <p>Your NFC/QR link will remain active, but it will no longer point to this profile.</p>
        <div className="taplex-warning-card"><b>{disconnectProduct.serial_number}</b><span>Your profile stays live. This physical tag returns to the TapLex signup and claim flow.</span></div>
        <form onSubmit={(event) => void disconnectTag(event)}>
          <label className="taplex-modal-field"><span>Type DISCONNECT to confirm</span><input autoFocus autoComplete="off" value={disconnectConfirmation} onChange={(event) => setDisconnectConfirmation(event.target.value)} /></label>
          <div className="taplex-modal-actions"><button type="button" className="quiet" onClick={() => setDisconnectProduct(null)} disabled={busy}>Cancel</button><button type="submit" className="danger" disabled={busy || disconnectConfirmation !== "DISCONNECT"}>{busy ? "Disconnecting…" : "Disconnect Tag"}</button></div>
        </form>
      </section>
    </div> : null}
  </>;
}
