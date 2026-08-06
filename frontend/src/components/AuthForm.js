"use client";

import { useState } from "react";
import { isFirebaseConfigured, sendReset, loginWithEmail, registerWithEmail } from "@/lib/firebase";
import { loginLocalPreviewUser, registerLocalPreviewUser, sendLocalPreviewReset } from "@/lib/localPreviewAuth";

import styles from "./Form.module.css";

export default function AuthForm({ mode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState({ message: "", tone: "neutral" });
  const isReset = mode === "forgot";
  const usesFirebase = isFirebaseConfigured();

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ message: "Working...", tone: "neutral" });

    try {
      if (mode === "login") {
        if (usesFirebase) {
          await loginWithEmail(email, password);
          setStatus({ message: "Signed in.", tone: "success" });
        } else {
          await loginLocalPreviewUser(email, password);
          setStatus({ message: "Signed in with your local preview account.", tone: "success" });
        }
      } else if (mode === "register") {
        if (usesFirebase) {
          await registerWithEmail(email, password);
          setStatus({ message: "Account created.", tone: "success" });
        } else {
          await registerLocalPreviewUser(email, password);
          setStatus({
            message: "Local preview account created. Add Firebase env values later for real cloud accounts.",
            tone: "success"
          });
        }
      } else {
        if (usesFirebase) {
          await sendReset(email);
          setStatus({ message: "Password reset sent.", tone: "success" });
        } else {
          sendLocalPreviewReset(email);
          setStatus({
            message: "Local preview account found. Real password reset emails require Firebase setup.",
            tone: "neutral"
          });
        }
      }
    } catch (error) {
      setStatus({ message: error.message, tone: "error" });
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {!usesFirebase ? (
        <p className={styles.authNotice}>
          Local preview mode is active because Firebase credentials are not configured.
        </p>
      ) : null}
      <label>
        Email
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>
      {!isReset ? (
        <label>
          Password
          <input
            type="password"
            value={password}
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
      ) : null}
      <button type="submit">
        {mode === "login" ? "Login" : mode === "register" ? "Register" : "Send Reset"}
      </button>
      {status.message ? (
        <p className={styles.status} data-tone={status.tone}>
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
