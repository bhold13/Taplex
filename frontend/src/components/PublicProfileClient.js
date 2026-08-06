"use client";

import Link from "next/link";
import { LoaderCircle, SearchX, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { loadPublicProfileByUsername } from "@/lib/profileStore";

import BioProfilePage from "./BioProfilePage";
import styles from "./BioProfilePage.module.css";

export default function PublicProfileClient({ username }) {
  const [state, setState] = useState({ status: "loading", profile: null, message: "" });

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      try {
        const profile = await loadPublicProfileByUsername(username);

        if (isActive) {
          setState(profile ? { status: "ready", profile, message: "" } : { status: "not-found", profile: null, message: "" });
        }
      } catch (error) {
        if (isActive) {
          setState({
            status: "error",
            profile: null,
            message: error.message || "This profile could not be loaded."
          });
        }
      }
    }

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [username]);

  if (state.status === "loading") {
    return (
      <main className={styles.statePage}>
        <LoaderCircle className={styles.spinner} size={30} aria-hidden="true" />
        <h1>Loading profile</h1>
        <p>Opening @{username}&apos;s TapLex.</p>
      </main>
    );
  }

  if (state.status === "not-found") {
    return (
      <main className={styles.statePage}>
        <SearchX size={34} aria-hidden="true" />
        <span>TapLex profile</span>
        <h1>Profile not found</h1>
        <p>@{username} has not published a TapLex profile yet.</p>
        <div className={styles.stateActions}>
          <Link href="/discover">Explore Discover</Link>
          <Link href="/profile-builder">Claim your username</Link>
        </div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className={styles.statePage}>
        <ShieldAlert size={34} aria-hidden="true" />
        <span>TapLex profile</span>
        <h1>Profile unavailable</h1>
        <p>{state.message}</p>
        <div className={styles.stateActions}>
          <button type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
          <Link href="/discover">Explore Discover</Link>
        </div>
      </main>
    );
  }

  return <BioProfilePage profile={state.profile} />;
}
