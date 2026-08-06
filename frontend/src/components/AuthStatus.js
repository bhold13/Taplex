"use client";

import Link from "next/link";
import { Crown, LogOut, UserCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { isFirebaseConfigured, logout, subscribeToAuth } from "@/lib/firebase";
import {
  getLocalPreviewSession,
  localPreviewAuthEvent,
  logoutLocalPreviewUser
} from "@/lib/localPreviewAuth";

import styles from "./AuthStatus.module.css";

export default function AuthStatus() {
  const router = useRouter();
  const usesFirebase = isFirebaseConfigured();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (usesFirebase) {
      return subscribeToAuth((firebaseUser) => {
        setUser(firebaseUser ? { uid: firebaseUser.uid, email: firebaseUser.email || "" } : null);
        setIsLoading(false);
      });
    }

    function syncPreviewSession() {
      setUser(getLocalPreviewSession());
      setIsLoading(false);
    }

    syncPreviewSession();
    window.addEventListener(localPreviewAuthEvent, syncPreviewSession);

    return () => window.removeEventListener(localPreviewAuthEvent, syncPreviewSession);
  }, [usesFirebase]);

  async function handleLogout() {
    setError("");

    try {
      if (usesFirebase) {
        await logout();
      } else {
        logoutLocalPreviewUser();
      }

      setUser(null);
      router.push("/");
      router.refresh();
    } catch (logoutError) {
      setError(logoutError.message || "Logout failed.");
    }
  }

  if (isLoading) {
    return <div className={styles.loading} aria-label="Checking account" />;
  }

  if (!user) {
    return (
      <div className={styles.authLinks}>
        <Link href="/login">Login</Link>
        <Link href="/register" className={styles.joinLink}>
          <Crown size={15} aria-hidden="true" />
          Join
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.accountArea}>
      <Link className={styles.accountLink} href="/dashboard" title={user.email || "TapLex account"}>
        <UserCircle2 size={18} aria-hidden="true" />
        <span>{user.email || "Account"}</span>
      </Link>
      <button type="button" onClick={handleLogout} title="Log out" aria-label="Log out">
        <LogOut size={17} aria-hidden="true" />
      </button>
      {error ? <span className={styles.error}>{error}</span> : null}
    </div>
  );
}
