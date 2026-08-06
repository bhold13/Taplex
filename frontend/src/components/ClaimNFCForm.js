"use client";

import { useState } from "react";

import styles from "./Form.module.css";

export default function ClaimNFCForm() {
  const [chipType, setChipType] = useState("NTAG215");
  const [profileId, setProfileId] = useState("");
  const [status, setStatus] = useState("Ready");

  function submit(event) {
    event.preventDefault();
    setStatus(`Prepared claim for ${chipType} linked to profile ${profileId || "pending"}.`);
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label>
        Profile ID
        <input value={profileId} onChange={(event) => setProfileId(event.target.value)} required />
      </label>
      <label>
        Chip type
        <select value={chipType} onChange={(event) => setChipType(event.target.value)}>
          <option value="NTAG213">NTAG213</option>
          <option value="NTAG215">NTAG215</option>
          <option value="NTAG216">NTAG216</option>
        </select>
      </label>
      <button type="submit">Prepare Claim</button>
      <p className={styles.status}>{status}</p>
    </form>
  );
}
