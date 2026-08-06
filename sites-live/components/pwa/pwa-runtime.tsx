"use client";

import { useEffect, useRef, useState } from "react";

type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };
type DeferredInstallPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<InstallChoice>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function isIosBrowser() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function PwaRuntime() {
  const [promptEvent, setPromptEvent] = useState<DeferredInstallPrompt | null>(null);
  const [open, setOpen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [installing, setInstalling] = useState(false);
  const installButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const standalone = isStandalone();
    document.body.classList.toggle("pwa-standalone", standalone);
    const splashTimer = window.setTimeout(() => document.body.classList.add("pwa-ready"), standalone ? 950 : 0);
    let updateServiceWorker: (() => void) | null = null;
    const handleOnline = () => updateServiceWorker?.();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") updateServiceWorker?.();
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then((registration) => {
        updateServiceWorker = () => void registration.update();
        updateServiceWorker();
        window.addEventListener("online", handleOnline);
        document.addEventListener("visibilitychange", handleVisibility);
      }).catch(() => undefined);
    }

    const handlePrompt = (rawEvent: Event) => {
      const event = rawEvent as DeferredInstallPrompt;
      event.preventDefault();
      setPromptEvent(event);
    };
    const handleInstalled = () => {
      setOpen(false);
      setPromptEvent(null);
      document.body.classList.add("pwa-standalone");
    };
    const handleManualInstall = () => {
      if (!isStandalone()) {
        setShowInstructions(false);
        setOpen(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("taplex:open-install", handleManualInstall);

    return () => {
      window.clearTimeout(splashTimer);
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("taplex:open-install", handleManualInstall);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("pwa-modal-open", open);
    if (!open) return;
    installButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !installing) dismiss();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, installing]);

  function dismiss() {
    setOpen(false);
    setShowInstructions(false);
  }

  async function install() {
    if (!promptEvent) {
      setShowInstructions(true);
      return;
    }
    setInstalling(true);
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
      setOpen(false);
      setPromptEvent(null);
    } finally {
      setInstalling(false);
    }
  }

  if (!open || isStandalone()) return null;

  return (
    <div className="pwa-install-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !installing) dismiss();
    }}>
      <section className="pwa-install-modal" role="dialog" aria-modal="true" aria-labelledby="pwa-install-title" aria-describedby="pwa-install-description">
        <button className="pwa-install-close" type="button" onClick={dismiss} aria-label="Close install prompt" disabled={installing}>×</button>
        <div className="pwa-install-logo" aria-hidden="true"><img src="/pwa/icon-192x192.png" alt="" /></div>
        <span className="pwa-install-eyebrow">TAPLEX MOBILE</span>
        <h2 id="pwa-install-title">Install TapLex</h2>
        <p id="pwa-install-description">Add TapLex to your home screen for faster access, instant networking, QR scanning, NFC support, and a native app experience.</p>
        {showInstructions ? (
          <div className="pwa-install-instructions" role="status">
            {isIosBrowser() ? <><b>Add TapLex on iPhone</b><span>Tap the Share button in Safari, choose <strong>Add to Home Screen</strong>, then tap Add.</span></> : <><b>Install from your browser</b><span>Open the browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</span></>}
          </div>
        ) : null}
        <div className="pwa-install-benefits" aria-label="App benefits">
          <span><b>ϟ</b> Faster launch</span>
          <span><b>⌁</b> NFC-ready</span>
          <span><b>↓</b> Offline access</span>
        </div>
        <div className="pwa-install-actions">
          <button ref={installButtonRef} className="primary" type="button" onClick={() => void install()} disabled={installing}>{installing ? "Installing…" : showInstructions ? "Got It" : "Install Now"}</button>
          <button className="quiet" type="button" onClick={dismiss} disabled={installing}>Maybe Later</button>
        </div>
        <small>Securely installed from taplex.co. No app store required.</small>
      </section>
    </div>
  );
}
