import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { logEvent } from "firebase/analytics";

import { getFirebaseAnalytics, getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value) {
  const email = normalizeEmail(value);
  return email.length <= 254 && EMAIL_PATTERN.test(email);
}

async function emailDocumentId(email) {
  const data = new TextEncoder().encode(email);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function trackEmailSignup(eventName, sourcePage) {
  try {
    const analytics = await getFirebaseAnalytics();
    if (analytics) logEvent(analytics, eventName, { source_page: sourcePage });
  } catch {
    // Analytics must never prevent a subscription.
  }
}

export async function subscribeEmail({ email: rawEmail, sourcePage }) {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) throw new Error("Enter a valid email address.");
  if (!isFirebaseConfigured()) throw new Error("Email signup is not available right now. Please try again later.");

  const id = await emailDocumentId(email);
  await setDoc(doc(getFirebaseDb(), "emailSubscribers", id), {
    email,
    signupDate: serverTimestamp(),
    sourcePage,
    consentStatus: "subscribed"
  });
}
