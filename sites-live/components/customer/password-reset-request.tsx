"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { readApiResponse } from "@/lib/client-response";

export default function PasswordResetRequest() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email") }) });
      const data = await readApiResponse<{ message?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Reset email could not be sent.");
      setMessage(data.message ?? "Check your email for the reset link.");
      setState("sent");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reset email could not be sent.");
      setState("error");
    }
  }

  return <>
    <form className="auth-email-form" onSubmit={submit}>
      <label><span>Email</span><input name="email" type="email" inputMode="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></label>
      <p className="auth-reset-help">Created your account with Google? This secure email will add password sign-in to that same TapLex account without disconnecting Google.</p>
      {message ? <p className={state === "sent" ? "auth-form-success" : "auth-form-error"} role="status">{message}</p> : null}
      <button type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending…" : state === "sent" ? "Send another link" : "Send reset link"}<span>→</span></button>
    </form>
    <p className="auth-switch">Remembered it? <Link href="/login">Back to login</Link></p>
  </>;
}
