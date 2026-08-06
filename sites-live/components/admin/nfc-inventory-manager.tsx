"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { zipSync } from "fflate";
import { readApiResponse } from "@/lib/client-response";

type Unit = {
  id: string; serialNumber: string; status: string; batchNumber: string; productType: string; color: string; sku: string;
  ownerEmail: string | null; ownerName: string | null; profileHandle: string | null; orderId: string | null; purchaserEmail: string | null;
  tapCount: number; lastTappedAt: string | null; updatedAt: string;
};
type CreatedUnit = { id: string; serialNumber: string; url: string; qrFilename: string };
type AuditLog = { id: string; serial_number?: string; batch_number?: string; actor_email: string; action: string; metadata_json: string; created_at: string };
type Toast = { kind: "success" | "error"; message: string };

const emptyBatch = { productType: "NFC Tag", color: "Black & Gold", sku: "TLX-TAG", batchNumber: "", quantity: "10", status: "inventory", purchaserEmail: "", orderId: "" };

export default function NfcInventoryManager() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [created, setCreated] = useState<CreatedUnit[]>([]);
  const [form, setForm] = useState(emptyBatch);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showAudit, setShowAudit] = useState(false);
  const [resetUnit, setResetUnit] = useState<Unit | null>(null);
  const [resetReason, setResetReason] = useState("");
  const [confirmFrozenReset, setConfirmFrozenReset] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const query = new URLSearchParams(); if (search.trim()) query.set("search", search.trim()); if (status) query.set("status", status);
      const response = await fetch(`/api/admin/nfc?${query}`, { headers: { Accept: "application/json" } });
      const data = await readApiResponse<{ units?: Unit[]; auditLogs?: AuditLog[] }>(response);
      if (!response.ok) throw new Error(data.error || "NFC inventory could not be loaded.");
      setUnits(data.units || []); setAuditLogs(data.auditLogs || []);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "NFC inventory could not be loaded."); }
    finally { setLoading(false); }
  }, [search, status]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function openReset(unit: Unit) {
    setResetUnit(unit);
    setResetReason("");
    setConfirmFrozenReset(false);
    setToast(null);
  }

  async function confirmReset() {
    if (!resetUnit || (resetUnit.status === "frozen" && !confirmFrozenReset)) return;
    setBusy(true); setError(""); setMessage(""); setToast(null);
    try {
      const response = await fetch("/api/admin/nfc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", unitId: resetUnit.id, reason: resetReason, confirmFrozen: confirmFrozenReset }),
      });
      const data = await readApiResponse<Record<string, never>>(response);
      if (!response.ok) throw new Error(data.error || "Tag reset failed.");
      setResetUnit(null); setResetReason(""); setConfirmFrozenReset(false);
      setToast({ kind: "success", message: "Tag reset. It is ready to be claimed again." });
      await load();
    } catch (caught) {
      setToast({ kind: "error", message: caught instanceof Error ? caught.message : "Tag reset failed. Please try again." });
    } finally { setBusy(false); }
  }

  async function createBatch(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage(""); setCreated([]);
    try {
      const response = await fetch("/api/admin/nfc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, quantity: Number(form.quantity) }) });
      const data = await readApiResponse<{ units?: CreatedUnit[] }>(response);
      if (!response.ok || !data.units) throw new Error(data.error || "Batch could not be created.");
      setCreated(data.units); setMessage(`${data.units.length} permanent activation links created. Download the CSV and QR files now—TapLex stores only their hashes.`);
      setForm({ ...emptyBatch, batchNumber: "" }); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Batch could not be created."); }
    finally { setBusy(false); }
  }

  async function action(unit: Unit, kind: string) {
    let recipientEmail = "";
    if (kind === "transfer") { recipientEmail = window.prompt("Recipient email (they must authenticate and accept):", "")?.trim() || ""; if (!recipientEmail) return; }
    if ((kind === "freeze" || kind === "replace") && !window.confirm(kind === "freeze" ? `Freeze ${unit.serialNumber}? Future taps will stop.` : `Replace ${unit.serialNumber}? The old URL will be frozen and a new one-time secret generated.`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/nfc", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: kind, unitId: unit.id, recipientEmail, status: kind === "release_inventory" ? "unclaimed" : undefined }) });
      const data = await readApiResponse<{ message?: string; replacement?: CreatedUnit }>(response);
      if (!response.ok) throw new Error(data.error || "Inventory action failed.");
      if (data.replacement) { setCreated([data.replacement]); setMessage("Replacement created. Download its QR and custody CSV now; the original is frozen."); }
      else setMessage(data.message || `${unit.serialNumber} updated.`);
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Inventory action failed."); }
    finally { setBusy(false); }
  }

  async function setUnitStatus(unit: Unit, nextStatus: "inventory" | "unclaimed") {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/nfc", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set_status", unitId: unit.id, status: nextStatus }) });
      const data = await readApiResponse<Record<string, never>>(response); if (!response.ok) throw new Error(data.error || "Status could not be changed.");
      setMessage(`${unit.serialNumber} is now ${nextStatus}.`); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Status could not be changed."); }
    finally { setBusy(false); }
  }

  function downloadCsv() {
    const rows = [["serial_number", "permanent_https_url", "qr_filename"], ...created.map((unit) => [unit.serialNumber, unit.url, unit.qrFilename])];
    downloadBlob(new Blob([rows.map((row) => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }), `taplex-nfc-${Date.now()}.csv`);
  }

  async function downloadQr(unit: CreatedUnit) {
    const dataUrl = await QRCode.toDataURL(unit.url, { width: 1200, margin: 4, errorCorrectionLevel: "H", color: { dark: "#090909", light: "#ffffff" } });
    const link = document.createElement("a"); link.href = dataUrl; link.download = unit.qrFilename; link.click();
  }

  async function downloadAllQrs() {
    setBusy(true); setError("");
    try {
      const files: Record<string, Uint8Array> = {};
      for (const [index, unit] of created.entries()) {
        setMessage(`Generating QR ${index + 1} of ${created.length}…`);
        const dataUrl = await QRCode.toDataURL(unit.url, { width: 720, margin: 4, errorCorrectionLevel: "H", color: { dark: "#090909", light: "#ffffff" } });
        const binary = atob(dataUrl.split(",")[1] || "");
        files[unit.qrFilename] = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      }
      const archive = zipSync(files, { level: 0 });
      const buffer = archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength) as ArrayBuffer;
      downloadBlob(new Blob([buffer], { type: "application/zip" }), `taplex-qr-${Date.now()}.zip`);
      setMessage(`${created.length} matching QR files downloaded as a ZIP. Keep it with the CSV production manifest.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "QR ZIP could not be generated."); }
    finally { setBusy(false); }
  }

  return <>
  <section className="nfc-admin">
    <div className="nfc-admin-intro"><div><span>NFC PRODUCT CONTROL</span><h2>Tap-to-Claim inventory</h2><p>Generate permanent tags, custody exports, secure ownership, replacements, and transfers.</p></div><div className="nfc-status-summary"><b>{units.length}</b><span>visible results</span><small>{units.filter((unit) => unit.status === "active").length} active · {units.reduce((sum, unit) => sum + unit.tapCount, 0)} private taps</small></div></div>
    {error ? <div className="admin-alert error" role="alert">{error}</div> : null}{message ? <div className="admin-alert success" role="status">{message}</div> : null}
    <div className="nfc-admin-grid"><form className="nfc-batch-form" onSubmit={createBatch}><div className="manager-heading"><span>Production batch</span><b>Create permanent links</b></div><div className="nfc-form-grid"><label>Product type<select value={form.productType} onChange={(event) => setForm({ ...form, productType: event.target.value })}><option>NFC Tag</option><option>NFC Card</option><option>NFC Wristband</option><option>NFC Keychain</option><option>NFC Sticker</option><option>Custom NFC Product</option></select></label><label>Color<input value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} maxLength={40} required /></label><label>SKU<input value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value.toUpperCase() })} maxLength={24} required placeholder="TLX-TAG" /></label><label>Batch number<input value={form.batchNumber} onChange={(event) => setForm({ ...form, batchNumber: event.target.value.toUpperCase() })} maxLength={32} required placeholder="2026-001" /></label><label>Quantity<input type="number" min="1" max="500" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} required /></label><label>Initial state<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="inventory">Inventory (not claimable)</option><option value="unclaimed">Unclaimed (ready to activate)</option></select></label><label>Purchaser email <small>Optional verification</small><input type="email" value={form.purchaserEmail} onChange={(event) => setForm({ ...form, purchaserEmail: event.target.value })} placeholder="buyer@example.com" /></label><label>Order ID <small>Optional</small><input value={form.orderId} onChange={(event) => setForm({ ...form, orderId: event.target.value })} maxLength={80} /></label></div><button className="button button-gold" type="submit" disabled={busy}>{busy ? "Generating securely…" : "Generate batch & QR links"}</button><p className="nfc-security-note">Each URL uses 192 bits of cryptographic randomness. Only its SHA-256 hash is stored.</p></form>
      <aside className="nfc-custody"><div className="manager-heading"><span>One-time custody export</span><b>{created.length ? `${created.length} secrets ready` : "Waiting for a batch"}</b></div>{created.length ? <><div className="nfc-custody-warning"><b>Download now</b><p>These URLs cannot be recovered later by design. Keep the CSV with your print/encoding production files.</p></div><div className="nfc-download-actions"><button type="button" onClick={downloadCsv}>Download CSV</button><button type="button" onClick={() => void downloadAllQrs()} disabled={busy}>Download all QR (.zip)</button></div><div className="nfc-secret-list">{created.map((unit) => <article key={unit.id}><div><b>{unit.serialNumber}</b><small>{unit.qrFilename}</small></div><a href={`${unit.url}?preview=1`} target="_blank" rel="noreferrer">Safe test</a><button type="button" onClick={() => void downloadQr(unit)}>QR ↓</button></article>)}</div></> : <p className="admin-empty">Create a batch or replacement. Its raw links appear here once only.</p>}</aside>
    </div>
    <div className="nfc-inventory-toolbar"><label><span>Search inventory</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Serial, owner, order, batch, color, status…" /></label><label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option>inventory</option><option>unclaimed</option><option>active</option><option>frozen</option><option>transfer_pending</option></select></label><button type="button" onClick={() => setShowAudit(!showAudit)}>{showAudit ? "Hide audit log" : "View audit log"}</button></div>
    {showAudit ? <div className="nfc-audit"><div className="manager-heading"><span>Immutable operations trail</span><b>Latest 100 events</b></div>{auditLogs.map((log) => <article key={log.id}><span>{log.action}</span><b>{log.serial_number || log.batch_number || "Inventory"}</b><small>{log.actor_email} · {new Date(log.created_at).toLocaleString()}</small></article>)}</div> : null}
    <div className="nfc-table-wrap"><table className="nfc-table"><thead><tr><th>Product</th><th>Status</th><th>Owner / order</th><th>Batch</th><th>Taps</th><th>Controls</th></tr></thead><tbody>{units.map((unit) => <tr key={unit.id}><td><b>{unit.serialNumber}</b><small>{unit.color} {unit.productType}</small></td><td><span className={`nfc-pill ${unit.status}`}>{unit.status}</span>{unit.status === "inventory" ? <button className="nfc-inline-action" onClick={() => void setUnitStatus(unit, "unclaimed")} disabled={busy}>Release for claim</button> : unit.status === "unclaimed" ? <button className="nfc-inline-action" onClick={() => void setUnitStatus(unit, "inventory")} disabled={busy}>Return to inventory</button> : null}</td><td><b>{unit.ownerEmail || unit.purchaserEmail || "Not assigned"}</b><small>{unit.profileHandle ? `@${unit.profileHandle}` : unit.orderId || "No order linked"}</small></td><td><b>{unit.batchNumber}</b><small>{unit.sku}</small></td><td><b>{unit.tapCount}</b><small>{unit.lastTappedAt ? new Date(unit.lastTappedAt).toLocaleDateString() : "No taps"}</small></td><td><div className="nfc-row-actions">{unit.status !== "frozen" ? <button onClick={() => void action(unit, "freeze")} disabled={busy}>Freeze</button> : <button onClick={() => void action(unit, "release")} disabled={busy}>Release</button>}<button onClick={() => void action(unit, "replace")} disabled={busy}>Replace</button>{unit.status === "active" ? <button onClick={() => void action(unit, "transfer")} disabled={busy}>Transfer</button> : null}<button className="danger" onClick={() => openReset(unit)} disabled={busy}>Reset Tag</button></div></td></tr>)}{!loading && !units.length ? <tr><td colSpan={6}><p className="admin-empty">No NFC products match this search.</p></td></tr> : null}</tbody></table>{loading ? <p className="admin-empty">Loading secure NFC inventory…</p> : null}</div>
  </section>
  {resetUnit ? <div className="taplex-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setResetUnit(null); }}>
    <section className="taplex-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="reset-tag-title">
      <button className="taplex-modal-close" type="button" aria-label="Close reset dialog" onClick={() => setResetUnit(null)} disabled={busy}>×</button>
      <span className="taplex-modal-eyebrow">ADMIN ONLY · RELEASE CLAIM</span>
      <h2 id="reset-tag-title">Reset {resetUnit.serialNumber}?</h2>
      <p>This will remove the current profile connection from this tag and return it to the signup/claim flow. The NFC/QR URL will stay the same.</p>
      <dl className="taplex-modal-summary"><div><dt>Current status</dt><dd>{resetUnit.status}</dd></div><div><dt>Connected profile</dt><dd>{resetUnit.profileHandle ? `@${resetUnit.profileHandle}` : "None"}</dd></div></dl>
      <label className="taplex-modal-field"><span>Reset reason <small>Optional · saved to audit log</small></span><textarea value={resetReason} maxLength={240} placeholder="Testing complete, customer replacement, support request…" onChange={(event) => setResetReason(event.target.value)} /></label>
      {resetUnit.status === "frozen" ? <label className="taplex-frozen-warning"><input type="checkbox" checked={confirmFrozenReset} onChange={(event) => setConfirmFrozenReset(event.target.checked)} /><span><b>Extra frozen-tag warning</b><small>This tag is frozen. I understand resetting it will make its unchanged permanent URL claimable again.</small></span></label> : null}
      <div className="taplex-modal-actions"><button type="button" className="quiet" onClick={() => setResetUnit(null)} disabled={busy}>Cancel</button><button type="button" className="danger" onClick={() => void confirmReset()} disabled={busy || (resetUnit.status === "frozen" && !confirmFrozenReset)}>{busy ? "Resetting securely…" : "Reset Tag"}</button></div>
    </section>
  </div> : null}
  {toast ? <div className={`taplex-toast ${toast.kind}`} role={toast.kind === "error" ? "alert" : "status"}><span>{toast.kind === "success" ? "✓" : "!"}</span><p>{toast.message}</p><button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}>×</button></div> : null}
  </>;
}

function csvCell(value: string) { return `"${value.replace(/"/g, '""')}"`; }
function downloadBlob(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
