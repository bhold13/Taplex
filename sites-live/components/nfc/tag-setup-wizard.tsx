"use client";

import { FormEvent, useState } from "react";
import type { TapLexProfile } from "@/lib/profile-model";
import { readApiResponse } from "@/lib/client-response";

export default function TagSetupWizard({ profile, product }: { profile: TapLexProfile; product: Record<string, unknown> }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ displayName: profile.displayName, handle: profile.handle, headline: profile.headline, bio: profile.bio });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function publish(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...profile, ...form, published: true }) });
      const data = await readApiResponse<{ profile?: TapLexProfile }>(response);
      if (!response.ok || !data.profile) throw new Error(data.error || "Your profile could not be published.");
      window.location.assign(`/p/${data.profile.handle}?activated=1`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Your profile could not be published."); setBusy(false); }
  }

  return <main className="setup-shell"><header className="setup-header"><span><img src="/taplex-logo.webp" alt="" /></span><b>TAPLEX</b><small>Product activated securely</small></header><section className="setup-card">
    <div className="setup-progress"><i className={step >= 1 ? "active" : ""} /><i className={step >= 2 ? "active" : ""} /><i className={step >= 3 ? "active" : ""} /></div>
    <p className="eyebrow"><span /> {String(product.product_type ?? "TapLex product")} connected</p>
    <form onSubmit={publish}>
      {step === 1 ? <div className="setup-step"><small>STEP 1 OF 3</small><h1>How should people know you?</h1><p>This is what appears when someone taps your TapLex.</p><label>Display name<input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} required minLength={2} maxLength={60} /></label><label>Your TapLex address<div className="setup-handle"><span>taplex.co/p/</span><input value={form.handle} onChange={(event) => setForm({ ...form, handle: event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })} required minLength={3} maxLength={30} /></div></label><button type="button" onClick={() => setStep(2)}>Continue <span>→</span></button></div> : null}
      {step === 2 ? <div className="setup-step"><small>STEP 2 OF 3</small><h1>Give every tap a reason to connect.</h1><label>Headline<input value={form.headline} onChange={(event) => setForm({ ...form, headline: event.target.value })} maxLength={100} placeholder="Artist · Barber · Entrepreneur" /></label><label>Short bio<textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} maxLength={500} /></label><div className="setup-actions"><button type="button" className="secondary" onClick={() => setStep(1)}>Back</button><button type="button" onClick={() => setStep(3)}>Continue <span>→</span></button></div></div> : null}
      {step === 3 ? <div className="setup-step setup-ready"><small>STEP 3 OF 3</small><span className="setup-check">✓</span><h1>Your permanent TapLex is ready.</h1><p>Publish now, then add socials, links, video, support, booking, and design anytime. Your NFC chip never needs reprogramming.</p><div><span>Permanent NFC URL</span><b>Connected</b></div><div><span>Public profile</span><b>Ready to publish</b></div>{error ? <p className="claim-error" role="alert">{error}</p> : null}<div className="setup-actions"><button type="button" className="secondary" onClick={() => setStep(2)}>Back</button><button type="submit" disabled={busy}>{busy ? "Publishing…" : "Publish & open profile"}<span>→</span></button></div></div> : null}
    </form>
  </section></main>;
}
