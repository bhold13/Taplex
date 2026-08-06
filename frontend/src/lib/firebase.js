import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";

import {
  getFirebaseAnalytics,
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseConfig,
  getFirebaseDb,
  getFirebaseStorage,
  isFirebaseConfigured
} from "./firebase/clientApp";

export {
  getFirebaseAnalytics,
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseConfig,
  getFirebaseDb,
  getFirebaseStorage,
  isFirebaseConfigured
};

export async function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
}

export async function registerWithEmail(email, password) {
  return createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
}

export async function sendReset(email) {
  return sendPasswordResetEmail(getFirebaseAuth(), email.trim());
}

export async function logout() {
  return signOut(getFirebaseAuth());
}

export function subscribeToAuth(callback) {
  if (!isFirebaseConfigured()) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(getFirebaseAuth(), callback);
}
