"use client";

import Link from "next/link";
import { useState } from "react";

import { subscribeEmail, trackEmailSignup } from "@/lib/emailSubscribers";
import styles from "./EmailSignup.module.css";

export default function EmailSignup({ sourcePage }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    await trackEmailSignup("email_signup_attempt", sourcePage);
    try {
      await subscribeEmail({ email, sourcePage });
      await trackEmailSignup("email_signup_success", sourcePage);
      setEmail("");
      setStatus("success");
      setMessage("You’re on the list. Welcome to TapLex.");
    } catch (error) {
      setStatus("error");
      setMessage(error?.code === "permission-denied"
        ? "This address may already be subscribed, or signup is temporarily unavailable."
        : error.message || "We couldn’t add you right now. Please try again.");
    }
  }

  return (
    <section className={styles.signup} aria-labelledby="email-signup-title">
      <div>
        <p className={styles.eyebrow}>Stay connected</p>
        <h2 id="email-signup-title">Join the TapLex List</h2>
        <p>Get product drops, networking tips, TapLex updates, and exclusive offers delivered directly to your inbox.</p>
      </div>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor={`email-${sourcePage}`}>Email address</label>
        <div className={styles.controls}>
          <input id={`email-${sourcePage}`} name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} disabled={status === "loading"} required aria-describedby={`email-note-${sourcePage} email-status-${sourcePage}`} />
          <button type="submit" disabled={status === "loading"}>{status === "loading" ? "Joining…" : "Join My Email List"}</button>
        </div>
        <p id={`email-note-${sourcePage}`} className={styles.note}>By joining, you agree to receive TapLex email updates. See our <Link href="/privacy">Privacy Policy</Link>.</p>
        <p id={`email-status-${sourcePage}`} className={status === "error" ? styles.error : styles.status} role="status" aria-live="polite">{message}</p>
      </form>
    </section>
  );
}
