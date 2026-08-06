"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { chatGPTSignInPath } from "@/app/chatgpt-auth";
import { readApiResponse } from "@/lib/client-response";
import { profileSkins, type ProfileSkin } from "@/lib/profile-model";
import type { TapLexUser } from "@/lib/taplex-auth";

type AuthGatewayProps = {
  intent?: "login" | "create";
  user: TapLexUser | null;
  error?: string;
  returnTo?: string;
  selectedSkin?: ProfileSkin | null;
};

export default function AuthGateway({ intent = "login", user, error, returnTo = "/dashboard", selectedSkin = null }: AuthGatewayProps) {
  const creating = intent === "create";
  const [formError, setFormError] = useState(error ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const title = user ? "Your TapLex is ready." : creating ? "Create your TapLex." : "Welcome back";
  const detail = user ? "Continue to your profile builder to edit, preview, and publish your page." : creating ? "Use your email or Google account—no ChatGPT account required." : "Sign in to manage your TapLex.";
  const selectedSkinDetails = profileSkins.find((skin) => skin.id === selectedSkin);
  const googleParams = new URLSearchParams({ return_to: returnTo });
  if (creating && promoCode) googleParams.set("promo", promoCode);
  const createPath = selectedSkin ? `/signup?skin=${encodeURIComponent(selectedSkin)}` : "/signup";
  const loginPath = `/login?return_to=${encodeURIComponent(returnTo)}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(creating ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password"), promoCode, skin: selectedSkin }),
      });
      const data = await readApiResponse<Record<string, never>>(response);
      if (!response.ok) throw new Error(data.error ?? "Sign-in could not be completed.");
      window.location.assign(returnTo);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Sign-in could not be completed.");
      setSubmitting(false);
    }
  }

  return <main className="auth-shell">
    <header className="auth-header">
      <Link className="auth-brand" href="/" aria-label="TapLex home"><span className="auth-brand-mark"><img src="/taplex-logo.webp" alt="" /></span><span>TAPLEX</span></Link>
      <Link className="auth-back" href="/">Back to TapLex <span aria-hidden="true">→</span></Link>
    </header>
    <section className="auth-layout">
      <div className="auth-intro">
        <h1>{creating ? <>Make every tap<br />feel like <em>you.</em></> : <>Your TapLex.<br />Always within<br /><em>reach.</em></>}</h1>
        <p>{creating ? "Create a polished page for your links, socials, contact info, videos, bookings, products, and more." : "Sign in to edit your links, socials, contact info, and profile design—anytime, from anywhere."}</p><i aria-hidden="true" />
      </div>
      <div className="auth-card">
        <h2>{title}</h2><p>{detail}</p>
        {selectedSkinDetails ? <div className="auth-skin-choice" role="status"><span className={`public-skin-${selectedSkinDetails.id}`}><i /><i /><i /></span><span><small>Selected background</small><b>{selectedSkinDetails.name}</b><em>You can change it anytime.</em></span></div> : null}
        {user ? <Link className="auth-chatgpt-button" href={returnTo}>Open my TapLex <span>→</span></Link> : <>
          {creating ? <label className="auth-promo-field"><span><b>Have a TapLex access code?</b><small>Optional · enter it now to unlock the features included with your code.</small></span><input aria-label="Founder or promo code" value={promoCode} onChange={(event) => setPromoCode(event.target.value.toUpperCase())} autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={32} placeholder="Enter promo code" /></label> : null}
          <a className="auth-google-button" href={`/api/auth/google/start?${googleParams.toString()}`}><GoogleMark />Continue with Google</a>
          <div className="auth-divider"><span />or use email<span /></div>
          <form className="auth-email-form" onSubmit={submit}>
            {creating ? <label><span>Your name</span><input name="name" autoComplete="name" required minLength={2} maxLength={80} placeholder="Your name" /></label> : null}
            <label><span>Email</span><input name="email" type="email" inputMode="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></label>
            <label><span className="auth-password-label">Password{!creating ? <Link href="/forgot-password">Forgot password?</Link> : null}</span><input name="password" type="password" autoComplete={creating ? "new-password" : "current-password"} required minLength={10} maxLength={128} placeholder={creating ? "At least 10 characters" : "Your password"} /></label>
            {formError ? <p className="auth-form-error" role="alert">{decodeError(formError)}</p> : null}
            <button type="submit" disabled={submitting}>{submitting ? "Please wait…" : creating ? "Create my TapLex" : "Log in"}<span>→</span></button>
          </form>
          <div className="auth-security"><span aria-hidden="true">♢</span><p><b>Private, secure account.</b> Passwords are salted and hashed. TapLex never stores the password you typed.</p></div>
          <details className="auth-chatgpt-option"><summary>Already used ChatGPT sign-in?</summary><a href={chatGPTSignInPath(returnTo)}>Continue with ChatGPT</a></details>
          <p className="auth-switch">{creating ? "Already have a TapLex?" : "New to TapLex?"} <Link href={creating ? loginPath : createPath}>{creating ? "Log in" : "Create your page"}</Link></p>
        </>}
      </div>
    </section>
  </main>;
}

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3v2.7A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.9A6 6 0 0 1 6.1 12c0-.7.1-1.3.3-1.9V7.4H3A10 10 0 0 0 2 12c0 1.7.4 3.2 1 4.6l3.4-2.7Z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-9 5.4l3.4 2.7C7.2 7.7 9.4 5.9 12 5.9Z"/></svg>;
}

function decodeError(value: string) {
  try { return decodeURIComponent(value.replace(/\+/g, " ")).slice(0, 180); } catch { return value.slice(0, 180); }
}
