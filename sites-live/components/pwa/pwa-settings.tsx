"use client";

import { useEffect, useState } from "react";
import { readApiResponse } from "@/lib/client-response";

type PushConfig = {
  configured: boolean;
  firebase?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  vapidKey?: string;
};

type PushState = "checking" | "ready" | "enabling" | "enabled" | "blocked" | "unavailable" | "error";

function runningStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export default function PwaSettings() {
  const [installed, setInstalled] = useState(false);
  const [config, setConfig] = useState<PushConfig>({ configured: false });
  const [pushState, setPushState] = useState<PushState>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setInstalled(runningStandalone()));
    const supported = "serviceWorker" in navigator && "Notification" in window;
    if (!supported) {
      window.queueMicrotask(() => setPushState("unavailable"));
      return () => window.cancelAnimationFrame(frame);
    }
    fetch("/api/push/config", { cache: "no-store" }).then(async (response) => {
      const nextConfig = await readApiResponse<PushConfig>(response);
      setConfig(nextConfig);
      if (!nextConfig.configured) setPushState("unavailable");
      else if (Notification.permission === "granted") setPushState("enabled");
      else if (Notification.permission === "denied") setPushState("blocked");
      else setPushState("ready");
    }).catch(() => setPushState("error"));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function enableNotifications() {
    if (!config.configured || !config.firebase || !config.vapidKey) return;
    setPushState("enabling");
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState(permission === "denied" ? "blocked" : "ready");
        setMessage(permission === "denied" ? "Notifications are blocked in this browser’s site settings." : "Notification permission was not enabled.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const [{ getApps, initializeApp }, { getMessaging, getToken, isSupported }] = await Promise.all([
        import("firebase/app"),
        import("firebase/messaging"),
      ]);
      if (!(await isSupported())) throw new Error("Push notifications are not supported by this browser.");
      const existing = getApps().find((app) => app.name === "taplex-pwa");
      const firebaseApp = existing ?? initializeApp(config.firebase, "taplex-pwa");
      const token = await getToken(getMessaging(firebaseApp), {
        vapidKey: config.vapidKey,
        serviceWorkerRegistration: registration,
      });
      if (!token) throw new Error("This device could not be registered for TapLex notifications.");

      const response = await fetch("/api/push/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, platform: navigator.userAgent }),
      });
      const data = await readApiResponse<{ ok?: boolean }>(response);
      if (!response.ok || !data.ok) throw new Error(data.error || "This device could not be registered.");
      setPushState("enabled");
      setMessage("TapLex notifications are enabled on this device.");
    } catch (error) {
      setPushState("error");
      setMessage(error instanceof Error ? error.message : "Notifications could not be enabled.");
    }
  }

  return (
    <section className="editor-panel pwa-settings-card">
      <div className="editor-panel-heading"><div><h2>TapLex App</h2><p>Install TapLex for a faster, full-screen mobile experience.</p></div><span>{installed ? "INSTALLED" : "PWA READY"}</span></div>
      <div className="pwa-setting-row">
        <span className="pwa-setting-icon" aria-hidden="true">▣</span>
        <span><b>{installed ? "TapLex is installed" : "Add TapLex to your home screen"}</b><small>{installed ? "You’re using the standalone TapLex experience." : "Launch faster, keep profile pages available offline, and open TapLex links directly."}</small></span>
        <button type="button" disabled={installed} onClick={() => window.dispatchEvent(new Event("taplex:open-install"))}>{installed ? "Installed" : "Install App"}</button>
      </div>
      <div className="pwa-setting-row">
        <span className="pwa-setting-icon" aria-hidden="true">◉</span>
        <span><b>TapLex notifications</b><small>{pushState === "unavailable" ? "Push delivery is prepared and will activate when TapLex Firebase messaging is connected." : "Receive important TapLex account, product, and networking updates."}</small></span>
        <button type="button" disabled={["checking", "enabling", "enabled", "blocked", "unavailable"].includes(pushState)} onClick={() => void enableNotifications()}>{pushState === "enabling" ? "Enabling…" : pushState === "enabled" ? "Enabled" : pushState === "blocked" ? "Blocked" : pushState === "unavailable" ? "Not Active" : "Enable"}</button>
      </div>
      {message ? <p className={`pwa-settings-message ${pushState === "error" || pushState === "blocked" ? "error" : ""}`} role="status">{message}</p> : null}
    </section>
  );
}
