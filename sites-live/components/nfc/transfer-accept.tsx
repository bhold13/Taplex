"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import type { TapLexUser } from "@/lib/taplex-auth";
import { readApiResponse } from "@/lib/client-response";

export default function TransferAccept({ token, user, googleConfigured, appleConfigured }: { token: string; user: TapLexUser | null; googleConfigured: boolean; appleConfigured: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const returnTo = `/transfer?token=${encodeURIComponent(token)}`;
  async function accept() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/tags/transfer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const data = await readApiResponse<{ handle?: string }>(response);
      if (!response.ok || !data.handle) throw new Error(data.error || "Transfer could not be accepted.");
      window.location.assign(`/p/${data.handle}?transfer=complete`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Transfer could not be accepted."); setBusy(false); }
  }
  async function sendMagic(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try { const response = await fetch("/api/auth/magic/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, returnTo }) }); const data = await readApiResponse<{ message?: string }>(response); if (!response.ok) throw new Error(data.error); setMessage(data.message || "Check your email to continue."); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Sign-in email could not be sent."); } finally { setBusy(false); }
  }
  return <main className="claim-shell"><header className="claim-header"><Link href="/" className="claim-brand"><span><img src="/taplex-logo.webp" alt="" /></span><b>TAPLEX</b></Link><small>Authenticated ownership transfer</small></header><section className="claim-card transfer-card"><div className="claim-product-mark"><span>⇄</span><i /><i /></div><p className="eyebrow"><span /> Protected TapLex transfer</p><h1>A TapLex product is waiting for you.</h1><p className="claim-detail">Ownership changes only after the invited recipient signs in and explicitly accepts.</p>
    {!user ? <div className="claim-auth">{googleConfigured ? <a className="claim-oauth google" href={`/api/auth/google/start?return_to=${encodeURIComponent(returnTo)}`}>Continue with Google</a> : null}{appleConfigured ? <a className="claim-oauth apple" href={`/api/auth/apple/start?return_to=${encodeURIComponent(returnTo)}`}>Continue with Apple</a> : null}<div className="claim-divider"><span />or use the invited email<span /></div><form onSubmit={sendMagic}><label><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} placeholder="invited@example.com" /></label><button type="submit" disabled={busy}>{busy ? "Sending…" : "Email me a sign-in link"}<span>→</span></button></form></div> : <div className="claim-ready"><span className="claim-ready-check">✓</span><div><small>Signed in securely as</small><b>{user.email}</b></div><button type="button" onClick={() => void accept()} disabled={busy}>{busy ? "Accepting securely…" : "Accept ownership"}<span>→</span></button></div>}
    {message ? <p className="claim-message" role="status">{message}</p> : null}{error ? <p className="claim-error" role="alert">{error}</p> : null}<footer><span>Verified recipient</span><span>•</span><span>One-time transfer</span><span>•</span><span>Audited by TapLex</span></footer></section></main>;
}
