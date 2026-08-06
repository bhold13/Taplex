"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { TapLexUser } from "@/lib/taplex-auth";
import type { PublicNfcTag } from "@/lib/nfc";
import { readApiResponse } from "@/lib/client-response";

export default function TagActivation({ tag, slug, user, preview, googleConfigured, appleConfigured, profiles = [] }: {
  tag: PublicNfcTag;
  slug: string;
  user: TapLexUser | null;
  preview: boolean;
  googleConfigured: boolean;
  appleConfigured: boolean;
  profiles?: Array<{ id: string; handle: string; displayName: string }>;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const returnTo = `/t/${slug}`;

  async function sendMagicLink(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auth/magic/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, returnTo }) });
      const data = await readApiResponse<{ message?: string }>(response);
      if (!response.ok) throw new Error(data.error || "The email could not be sent.");
      setMessage(data.message || "Check your email to continue.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The email could not be sent."); }
    finally { setBusy(false); }
  }

  async function claim() {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/tags/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, profileId: profileId || undefined }) });
      const data = await readApiResponse<{ setupUrl?: string }>(response);
      if (!response.ok || !data.setupUrl) throw new Error(data.error || "This product could not be claimed.");
      window.location.assign(data.setupUrl);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "This product could not be claimed."); setBusy(false); }
  }

  const unavailable = tag.status !== "unclaimed";
  return <main className="claim-shell">
    <div className="claim-glow" aria-hidden="true" />
    <header className="claim-header"><Link href="/" className="claim-brand"><span><img src="/taplex-logo.webp" alt="" /></span><b>TAPLEX</b></Link><small>Secure product activation</small></header>
    <section className="claim-card">
      {preview ? <div className="claim-preview"><b>Safe test mode</b><span>This page cannot claim the product, sign anyone in, redirect, or record a tap.</span></div> : null}
      <div className="claim-product-mark"><span>⌁</span><i /><i /></div>
      <p className="eyebrow"><span /> TapLex Tap-to-Claim</p>
      <h1>{unavailable ? statusTitle(tag.status) : "Make this TapLex yours."}</h1>
      <p className="claim-detail">{unavailable ? statusDetail(tag.status) : `Your ${tag.color ? `${tag.color} ` : ""}${tag.product_type} is ready. Sign in once, connect your profile, and every future tap goes straight to you.`}</p>
      <div className="claim-serial"><span>Product</span><b>{tag.serial_number}</b></div>

      {!unavailable && !user ? <div className="claim-auth">
        {googleConfigured ? <a className="claim-oauth google" href={`/api/auth/google/start?return_to=${encodeURIComponent(returnTo)}`}><GoogleMark />Continue with Google</a> : null}
        {appleConfigured ? <a className="claim-oauth apple" href={`/api/auth/apple/start?return_to=${encodeURIComponent(returnTo)}`}><span aria-hidden="true">●</span>Continue with Apple</a> : null}
        <div className="claim-divider"><span />or get a secure email link<span /></div>
        <form onSubmit={sendMagicLink}><label><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} autoComplete="email" placeholder="you@example.com" disabled={preview || busy} /></label><button type="submit" disabled={preview || busy}>{busy ? "Sending…" : "Email me a sign-in link"}<span>→</span></button></form>
        <p className="claim-auth-note">No password or serial number needed. Your sign-in link expires in 15 minutes.</p>
      </div> : null}

      {!unavailable && user ? <div className="claim-ready"><span className="claim-ready-check">✓</span><div><small>Signed in securely as</small><b>{user.email}</b></div>{profiles.length ? <label className="claim-profile-picker"><span>Connect this product to</span><select value={profileId} onChange={(event) => setProfileId(event.target.value)}>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.displayName} · @{profile.handle}</option>)}</select><small>You can change the connected profile later in My NFC.</small></label> : null}<button type="button" onClick={() => void claim()} disabled={preview || busy}>{busy ? "Claiming securely…" : "Claim & set up my TapLex"}<span>→</span></button><form method="post" action="/api/auth/logout"><button className="claim-switch" type="submit">Use a different account</button></form></div> : null}
      {message ? <p className="claim-message" role="status">{message}</p> : null}
      {error ? <p className="claim-error" role="alert">{error}</p> : null}
      <footer><span>Permanent secure link</span><span>•</span><span>One verified owner</span><span>•</span><span>Powered by TapLex</span></footer>
    </section>
  </main>;
}

function statusTitle(status: PublicNfcTag["status"]) {
  if (status === "inventory") return "This TapLex is not released yet.";
  if (status === "frozen") return "This TapLex is frozen.";
  if (status === "transfer_pending") return "A secure transfer is in progress.";
  return "This TapLex is already active.";
}

function statusDetail(status: PublicNfcTag["status"]) {
  if (status === "inventory") return "The product is genuine, but it must be released by TapLex before activation.";
  if (status === "frozen") return "This product has been paused for security. Contact TapLex support for help.";
  if (status === "transfer_pending") return "Ownership stays protected while the invited recipient authenticates and accepts.";
  return "This permanent tag link is already connected to its owner.";
}

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3v2.7A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.9A6 6 0 0 1 6.1 12c0-.7.1-1.3.3-1.9V7.4H3A10 10 0 0 0 2 12c0 1.7.4 3.2 1 4.6l3.4-2.7Z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-9 5.4l3.4 2.7C7.2 7.7 9.4 5.9 12 5.9Z"/></svg>;
}
