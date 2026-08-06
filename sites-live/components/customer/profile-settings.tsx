"use client";

import { FormEvent, useState } from "react";
import { readApiResponse } from "@/lib/client-response";
import PwaSettings from "@/components/pwa/pwa-settings";

export default function ProfileSettings({ handle, onManageTags }: { handle: string; onManageTags: () => void }) {
  const [showDelete, setShowDelete] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function deleteProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmation !== "DELETE") return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const data = await readApiResponse<{ affectedProductIds?: string[] }>(response);
      if (!response.ok) throw new Error(data.error || "Your profile could not be deleted.");
      setMessage(`Profile deleted. ${data.affectedProductIds?.length || 0} connected tag${data.affectedProductIds?.length === 1 ? " is" : "s are"} ready to be claimed again.`);
      window.setTimeout(() => window.location.assign("/"), 900);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your profile could not be deleted.");
      setBusy(false);
    }
  }

  return <>
    <div className="profile-settings-stack">
      <PwaSettings />
      <section className="editor-panel profile-settings-overview">
        <div className="editor-panel-heading"><div><h2>Profile Settings</h2><p>Manage your public page and the permanent tags connected to it.</p></div><span>@{handle}</span></div>
        <div className="profile-setting-row"><span><b>Disconnect a tag</b><small>Release only one tag. Your profile and all other tags stay active.</small></span><button type="button" onClick={onManageTags}>Manage my tags</button></div>
      </section>
      <section className="editor-panel profile-danger-zone">
        <div><span>DANGER ZONE</span><h2>Delete Profile</h2><p>Your public profile and its content will be removed. Every connected TapLex tag will safely return to the signup and claim flow without changing its permanent NFC/QR URL.</p></div>
        <button type="button" onClick={() => { setShowDelete(true); setConfirmation(""); setError(""); setMessage(""); }}>Delete Profile</button>
        <small>Your TapLex account remains available. Deleting a profile does not cancel a paid Pro subscription.</small>
      </section>
      {error ? <p className="profile-settings-feedback error" role="alert">{error}</p> : null}
      {message ? <p className="profile-settings-feedback success" role="status">{message}</p> : null}
    </div>
    {showDelete ? <div className="taplex-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setShowDelete(false); }}>
      <section className="taplex-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-profile-title">
        <button className="taplex-modal-close" type="button" aria-label="Close delete dialog" onClick={() => setShowDelete(false)} disabled={busy}>×</button>
        <span className="taplex-modal-eyebrow danger">DELETE PUBLIC PROFILE</span>
        <h2 id="delete-profile-title">Delete @{handle}?</h2>
        <p>Your public profile will be removed and its links, gallery, contact details, and location will be cleared.</p>
        <div className="taplex-warning-card"><b>Your NFC/QR link will remain active, but it will no longer point to this profile.</b><span>All connected tags will return to the TapLex signup and claim flow. Their slugs, serial numbers, QR codes, and permanent URLs stay unchanged.</span></div>
        <form onSubmit={(event) => void deleteProfile(event)}>
          <label className="taplex-modal-field"><span>Type DELETE to confirm</span><input autoFocus autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
          {error ? <p className="taplex-modal-error" role="alert">{error}</p> : null}
          <div className="taplex-modal-actions"><button type="button" className="quiet" onClick={() => setShowDelete(false)} disabled={busy}>Cancel</button><button type="submit" className="danger" disabled={busy || confirmation !== "DELETE"}>{busy ? "Deleting securely…" : "Delete Profile"}</button></div>
        </form>
      </section>
    </div> : null}
  </>;
}
