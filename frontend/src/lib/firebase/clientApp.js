import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const requiredConfigKeys = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId"
];

export function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  };
}

export function isFirebaseConfigured() {
  const config = getFirebaseConfig();

  return requiredConfigKeys.every(
    (key) => typeof config[key] === "string" && config[key].trim().length > 0
  );
}

function requireFirebaseConfig() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* values to .env.local.");
  }
}

export function getFirebaseApp() {
  requireFirebaseConfig();

  return getApps().length ? getApp() : initializeApp(getFirebaseConfig());
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb() {
  return getFirestore(getFirebaseApp());
}

export function getFirebaseStorage() {
  return getStorage(getFirebaseApp());
}

let analyticsPromise;

export function getFirebaseAnalytics() {
  const config = getFirebaseConfig();

  if (typeof window === "undefined" || !isFirebaseConfigured() || !config.measurementId) {
    return Promise.resolve(null);
  }

  if (!analyticsPromise) {
    analyticsPromise = import("firebase/analytics").then(async ({ getAnalytics, isSupported }) => {
      if (!(await isSupported())) {
        return null;
      }

      return getAnalytics(getFirebaseApp());
    });
  }

  return analyticsPromise;
}
