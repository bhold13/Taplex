"use client";

import { useState } from "react";

type ShareButtonProps = {
  className?: string;
  url?: string;
  title: string;
  text: string;
  label?: string;
};

export default function ShareButton({ className, url, title, text, label = "Share" }: ShareButtonProps) {
  const [buttonLabel, setButtonLabel] = useState(label);

  async function share() {
    const targetUrl = url ? new URL(url, window.location.origin).toString() : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: targetUrl });
        return;
      }
      await copyText(targetUrl);
      setButtonLabel("Link copied");
      window.setTimeout(() => setButtonLabel(label), 1800);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setButtonLabel("Copy failed");
      window.setTimeout(() => setButtonLabel(label), 1800);
    }
  }

  return (
    <button className={className} type="button" onClick={() => void share()} aria-label={`${label}: ${title}`}>
      <ShareIcon />
      <span>{buttonLabel}</span>
    </button>
  );
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("Copy unavailable");
}

function ShareIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" /></svg>;
}
