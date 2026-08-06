"use client";

import Link from "next/link";
import {
  BadgeCheck,
  BarChart3,
  CalendarClock,
  Crown,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  UserRoundPen
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { loadCurrentUserProfile } from "@/lib/profileStore";

import styles from "./ProfileDashboard.module.css";

function getCompletion(profile) {
  if (!profile) {
    return 0;
  }

  const checks = [
    profile.username,
    profile.displayName,
    profile.bio,
    profile.category,
    profile.profilePhotoUrl,
    profile.contactEmail,
    profile.socialLinks?.length,
    profile.mediaLinks?.length,
    profile.services?.length
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function ProfileDashboard() {
  const [state, setState] = useState({ status: "loading", mode: "loading", identity: null, profile: null, message: "" });

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      try {
        const context = await loadCurrentUserProfile();

        if (isActive) {
          setState({ status: "ready", ...context, message: "" });
        }
      } catch (error) {
        if (isActive) {
          setState({
            status: "error",
            mode: "error",
            identity: null,
            profile: null,
            message: error.message || "Your profile dashboard could not be loaded."
          });
        }
      }
    }

    loadDashboard();

    return () => {
      isActive = false;
    };
  }, []);

  const profile = state.profile;
  const plan = profile?.plan || "free";
  const completion = useMemo(() => getCompletion(profile), [profile]);
  const publicPath = profile?.usernameLower ? `/profile/${profile.usernameLower}` : "";
  const isBusiness = plan === "business";

  if (state.status === "loading") {
    return (
      <main className={styles.dashboardPage}>
        <div className={styles.loadingState} role="status">
          <LoaderCircle className={styles.spinner} size={26} aria-hidden="true" />
          Loading your profile dashboard...
        </div>
      </main>
    );
  }

  return (
    <main className={styles.dashboardPage}>
      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>Dashboard</p>
          <h1>Your TapLex profile.</h1>
          <p>Publish the essentials, share one premium link, and upgrade only when you are ready to book and grow.</p>
        </div>
        <div className={styles.heroActions}>
          <Link className={styles.primaryAction} href="/profile-builder">
            <UserRoundPen size={17} aria-hidden="true" />
            {profile ? "Edit profile" : "Create profile"}
          </Link>
          {publicPath ? (
            <Link className={styles.secondaryAction} href={publicPath}>
              <ExternalLink size={17} aria-hidden="true" />
              View public profile
            </Link>
          ) : null}
        </div>
      </section>

      {state.mode === "local" ? (
        <div className={styles.notice}>
          <ShieldCheck size={18} aria-hidden="true" />
          Preview mode is active. Your profile is stored in this browser until Firebase is configured.
        </div>
      ) : null}
      {state.mode === "firebase" && !state.identity ? (
        <div className={styles.notice} data-tone="warning">
          <LockKeyhole size={18} aria-hidden="true" />
          <span>
            <Link href="/login">Sign in</Link> to load and manage your cloud profile.
          </span>
        </div>
      ) : null}
      {state.status === "error" ? (
        <div className={styles.notice} data-tone="warning" role="alert">
          {state.message}
        </div>
      ) : null}

      <section className={styles.overviewGrid} aria-label="Profile overview">
        <article className={styles.completionCard}>
          <div className={styles.cardHeader}>
            <div>
              <span>Profile completion</span>
              <strong>{completion}%</strong>
            </div>
            <BadgeCheck size={24} aria-hidden="true" />
          </div>
          <div className={styles.progressTrack} aria-label={`${completion}% profile completion`}>
            <span style={{ width: `${completion}%` }} />
          </div>
          <p>
            {completion === 100
              ? "Your profile has every core element TapLex recommends."
              : "Add a photo, clear bio, contact path, links, media, and services to strengthen discovery."}
          </p>
        </article>

        <article className={styles.detailCard}>
          <span>Current username</span>
          <strong>{profile ? `@${profile.username}` : "Not claimed"}</strong>
          <p>{profile ? "Your public TapLex address is active." : "Save your first profile to claim a public address."}</p>
        </article>

        <article className={styles.detailCard}>
          <span>Current plan</span>
          <strong className={styles.planValue}>{plan}</strong>
          <p>
            {plan === "free"
              ? "Basic profile, public links, services, and contact are included."
              : plan === "pro"
                ? "Booking links and an expanded showcase are unlocked."
                : "Business growth features are included as they launch."}
          </p>
        </article>
      </section>

      <section className={styles.growthBand}>
        <div>
          {plan === "free" ? <CalendarClock size={24} aria-hidden="true" /> : <Crown size={24} aria-hidden="true" />}
          <span>{plan === "free" ? "Pro booking" : `${plan} plan`}</span>
          <h2>{plan === "free" ? "Upgrade to Pro to add booking." : "Your growth path is active."}</h2>
          <p>
            {plan === "free"
              ? "Keep your free profile live now, then unlock a booking button when clients are ready to schedule."
              : "TapLex will keep your premium profile simple while adding plan features in focused milestones."}
          </p>
        </div>
        {plan === "free" ? <Link href="/pricing">Compare plans</Link> : <Link href="/profile-builder">Manage profile</Link>}
      </section>

      <section className={styles.featureGrid} aria-label="Business feature status">
        <article>
          <BarChart3 size={21} aria-hidden="true" />
          <div>
            <span>{isBusiness ? "Included · Coming soon" : "Locked · Business"}</span>
            <h2>Profile analytics</h2>
            <p>Simple views, link taps, and booking interest will arrive in a later Business milestone.</p>
          </div>
          {!isBusiness ? <LockKeyhole size={18} aria-label="Locked" /> : null}
        </article>
        <article>
          <BadgeCheck size={21} aria-hidden="true" />
          <div>
            <span>{profile?.isVerified ? "Verified" : isBusiness ? "Included · Coming soon" : "Locked · Business"}</span>
            <h2>TapLex verification</h2>
            <p>Business verification will be reviewed and awarded manually when the program launches.</p>
          </div>
          {!isBusiness ? <LockKeyhole size={18} aria-label="Locked" /> : null}
        </article>
      </section>
    </main>
  );
}
