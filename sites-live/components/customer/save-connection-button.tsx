"use client";

import Link from "next/link";
import { useState } from "react";
import { readApiResponse } from "@/lib/client-response";

export default function SaveConnectionButton({ handle, signedIn }: { handle: string; signedIn: boolean }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  if (!signedIn) {
    return <Link className="public-save-connection" href={`/login?return_to=${encodeURIComponent(`/p/${handle}`)}`}><span aria-hidden="true">＋</span> Remember this person</Link>;
  }

  async function save() {
    setState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      const data = await readApiResponse<{ message?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Could not save this person.");
      setState("saved");
      setMessage(data.message ?? "Saved to People I Met.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not save this person.");
    }
  }

  return <div className="public-save-connection-wrap">
    <button className={`public-save-connection ${state}`} type="button" onClick={() => void save()} disabled={state === "saving" || state === "saved"}>
      <span aria-hidden="true">{state === "saved" ? "✓" : "＋"}</span>{state === "saving" ? "Saving…" : state === "saved" ? "Person saved" : "Remember this person"}
    </button>
    {message ? <small className={state} role="status">{message} {state === "saved" ? <Link href="/connections">View list</Link> : null}</small> : null}
  </div>;
}
