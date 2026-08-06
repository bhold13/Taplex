"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { readApiResponse } from "@/lib/client-response";

export default function NewPasswordForm({ token }: { token: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(token ? "" : "This password reset link is invalid or incomplete.");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password !== confirmation) { setError("The passwords do not match."); return; }
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const data = await readApiResponse<Record<string, never>>(response);
      if (!response.ok) throw new Error(data.error ?? "Password could not be reset.");
      window.location.assign("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Password could not be reset.");
      setSubmitting(false);
    }
  }

  if (!token) return <><p className="auth-form-error" role="alert">{error}</p><p className="auth-switch"><Link href="/forgot-password">Request a new reset link</Link></p></>;

  return <form className="auth-email-form" onSubmit={submit}>
    <label><span>New password</span><input name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} placeholder="At least 10 characters" /></label>
    <label><span>Confirm password</span><input name="confirmation" type="password" autoComplete="new-password" required minLength={10} maxLength={128} placeholder="Type it again" /></label>
    {error ? <p className="auth-form-error" role="alert">{error}</p> : null}
    <button type="submit" disabled={submitting}>{submitting ? "Updating…" : "Update password"}<span>→</span></button>
  </form>;
}
