"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { readApiResponse } from "@/lib/client-response";

type PromoCode = {
  code: string;
  description: string;
  maxRedemptions: number;
  redemptionCount: number;
  active: boolean;
  duration: "lifetime" | "one_year";
};

type PromoCodeForm = Pick<PromoCode, "code" | "description" | "duration"> & {
  maxRedemptions: string;
};

const emptyForm: PromoCodeForm = { code: "", description: "", maxRedemptions: "100", duration: "one_year" };

export default function PromoCodeManager() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadCodes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/promo-codes", { headers: { accept: "application/json" }, cache: "no-store" });
      const data = await readApiResponse<{ promoCodes?: PromoCode[] }>(response);
      if (!response.ok || !data.promoCodes) throw new Error(data.error ?? "Pro codes could not be loaded.");
      setCodes(data.promoCodes);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Pro codes could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCodes(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCodes]);

  async function createCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, maxRedemptions: Number(form.maxRedemptions), active: true }),
      });
      const data = await readApiResponse<{ promoCode?: PromoCode }>(response);
      if (!response.ok || !data.promoCode) throw new Error(data.error ?? "Pro code could not be created.");
      setForm(emptyForm);
      setMessage(`${data.promoCode.code} is ready to share.`);
      await loadCodes();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Pro code could not be created.");
    } finally {
      setSaving(false);
    }
  }

  async function updateCode(code: PromoCode, patch: Partial<PromoCode>) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const next = { ...code, ...patch };
      const response = await fetch("/api/admin/promo-codes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = await readApiResponse<{ promoCode?: PromoCode }>(response);
      if (!response.ok || !data.promoCode) throw new Error(data.error ?? "Pro code could not be updated.");
      setMessage(`${data.promoCode.code} was updated.`);
      await loadCodes();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Pro code could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="promo-manager">
    <div className="promo-manager-intro">
      <div><span>Pro access</span><h2>Promo code manager</h2><p>Create a new code here. To change a code name, make a new one and switch the old one off so past records remain accurate.</p></div>
      <aside><b>{codes.filter((code) => code.active).length}</b><span>active codes</span></aside>
    </div>

    {error ? <div className="admin-alert error" role="alert">{error}</div> : null}
    {message ? <div className="admin-alert success" role="status">{message}</div> : null}

    <form className="promo-create-form" onSubmit={createCode}>
      <div className="editor-heading"><span>New Pro code</span><b>Create access</b></div>
      <label>Code<input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} minLength={4} maxLength={32} placeholder="TAPLEX1YEAR" /></label>
      <label>Description<input required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={140} placeholder="One year of TapLex Pro" /></label>
      <label>Access length<select value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value === "lifetime" ? "lifetime" : "one_year" })}><option value="one_year">One year</option><option value="lifetime">Lifetime</option></select></label>
      <label>Maximum uses<input required type="number" min="1" max="100000" value={form.maxRedemptions} onChange={(event) => setForm({ ...form, maxRedemptions: event.target.value })} /></label>
      <button className="button button-gold" type="submit" disabled={saving}>{saving ? "Saving…" : "Create Pro Code"}</button>
    </form>

    <div className="promo-code-list">
      <div className="manager-heading"><span>All Pro codes</span><b>{codes.length} total</b></div>
      {loading ? <p className="admin-empty">Loading Pro codes…</p> : codes.map((code) => <article key={code.code} className={code.active ? "" : "inactive"}>
        <div className="promo-code-name"><small>{code.duration === "lifetime" ? "Lifetime Pro" : "One-year Pro"}</small><b>{code.code}</b><p>{code.description}</p></div>
        <div className="promo-code-usage"><b>{code.redemptionCount} / {code.maxRedemptions}</b><span>redemptions used</span></div>
        <label>Usage limit<input type="number" min={Math.max(1, code.redemptionCount)} max="100000" defaultValue={code.maxRedemptions} onBlur={(event) => { const value = Number(event.target.value); if (value !== code.maxRedemptions) void updateCode(code, { maxRedemptions: value }); }} /></label>
        <label>Length<select value={code.duration} onChange={(event) => void updateCode(code, { duration: event.target.value === "one_year" ? "one_year" : "lifetime" })} disabled={saving}><option value="lifetime">Lifetime</option><option value="one_year">One year</option></select></label>
        <button type="button" className={code.active ? "promo-disable" : "promo-enable"} onClick={() => void updateCode(code, { active: !code.active })} disabled={saving}>{code.active ? "Turn off" : "Turn on"}</button>
      </article>)}
    </div>
  </section>;
}
