"use client";

import {
  BarChart3,
  CalendarClock,
  Check,
  CircleDollarSign,
  Copy,
  Crown,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import { useMemo, useState } from "react";

import styles from "./AdminAccessCodes.module.css";

const fullFeatureAccess = [
  { id: "proProfile", label: "Pro bio page", Icon: Crown },
  { id: "nfcActivation", label: "NFC activation", Icon: KeyRound },
  { id: "advancedAnalytics", label: "Advanced analytics", Icon: BarChart3 },
  { id: "marketplace", label: "Marketplace selling", Icon: CircleDollarSign },
  { id: "taplexConnect", label: "TapLex Connect", Icon: Sparkles },
  { id: "businessTools", label: "Business dashboard", Icon: Users },
  { id: "prioritySupport", label: "Priority support", Icon: ShieldCheck }
];

const initialCodes = [
  {
    id: "founder-001",
    code: "TAPLEX-GOLD-8K2Q",
    label: "Founder full access",
    seats: 25,
    used: 7,
    expires: "2026-12-31",
    status: "Active",
    note: "Early supporters and trusted launch partners.",
    features: fullFeatureAccess.map((feature) => feature.id)
  },
  {
    id: "vip-002",
    code: "TAPLEX-VIP-4M9X",
    label: "VIP creator access",
    seats: 10,
    used: 2,
    expires: "2026-09-30",
    status: "Active",
    note: "Creators, barbers, artists, and premium service providers.",
    features: ["proProfile", "nfcActivation", "advancedAnalytics", "taplexConnect", "prioritySupport"]
  }
];

const defaultExpiry = "2026-12-31";

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segment = () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");

  return `TAPLEX-GOLD-${segment()}-${segment()}`;
}

export default function AdminAccessCodes() {
  const [label, setLabel] = useState("Full feature access");
  const [seats, setSeats] = useState(5);
  const [expires, setExpires] = useState(defaultExpiry);
  const [note, setNote] = useState("Unlocks every premium TapLex feature for selected users.");
  const [selectedFeatures, setSelectedFeatures] = useState(fullFeatureAccess.map((feature) => feature.id));
  const [codes, setCodes] = useState(initialCodes);
  const [copiedCode, setCopiedCode] = useState("");

  const selectedFeatureLabels = useMemo(
    () =>
      fullFeatureAccess
        .filter((feature) => selectedFeatures.includes(feature.id))
        .map((feature) => feature.label),
    [selectedFeatures]
  );

  function toggleFeature(featureId) {
    setSelectedFeatures((current) =>
      current.includes(featureId) ? current.filter((id) => id !== featureId) : [...current, featureId]
    );
  }

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(""), 1600);
    } catch {
      setCopiedCode("");
    }
  }

  function addCode(event) {
    event.preventDefault();

    const nextCode = {
      id: `${Date.now()}`,
      code: generateCode(),
      label: label.trim() || "Full feature access",
      seats: Math.max(1, Number(seats) || 1),
      used: 0,
      expires,
      status: "Active",
      note: note.trim() || "Full TapLex feature unlock.",
      features: selectedFeatures.length ? selectedFeatures : fullFeatureAccess.map((feature) => feature.id)
    };

    setCodes((current) => [nextCode, ...current]);
  }

  return (
    <section className={styles.accessShell} aria-label="Admin access codes">
      <div className={styles.sectionHeader}>
        <div>
          <p>Access Codes</p>
          <h2>Give selected users full TapLex access.</h2>
        </div>
        <span className={styles.securityPill}>
          <LockKeyhole size={16} aria-hidden="true" />
          Admin controlled
        </span>
      </div>

      <div className={styles.accessGrid}>
        <form className={styles.generator} onSubmit={addCode}>
          <div className={styles.formHeader}>
            <KeyRound size={22} aria-hidden="true" />
            <div>
              <h3>Create access code</h3>
              <p>Generate a premium unlock code for trusted users, customers, partners, or VIPs.</p>
            </div>
          </div>

          <div className={styles.fieldGrid}>
            <label>
              Code name
              <input value={label} onChange={(event) => setLabel(event.target.value)} />
            </label>
            <label>
              User seats
              <input
                min="1"
                type="number"
                value={seats}
                onChange={(event) => setSeats(event.target.value)}
              />
            </label>
            <label>
              Expires
              <input type="date" value={expires} onChange={(event) => setExpires(event.target.value)} />
            </label>
            <label className={styles.wide}>
              Admin note
              <textarea value={note} rows={3} onChange={(event) => setNote(event.target.value)} />
            </label>
          </div>

          <div className={styles.featureMatrix} aria-label="Full access features">
            {fullFeatureAccess.map(({ id, label: featureLabel, Icon }) => {
              const isSelected = selectedFeatures.includes(id);

              return (
                <button
                  aria-pressed={isSelected}
                  className={isSelected ? styles.featureActive : styles.feature}
                  key={id}
                  onClick={() => toggleFeature(id)}
                  type="button"
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{featureLabel}</span>
                  {isSelected ? <Check size={16} aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>

          <div className={styles.previewCode}>
            <span>Code package</span>
            <strong>{selectedFeatureLabels.join(" + ")}</strong>
          </div>

          <button className={styles.createButton} type="submit">
            <KeyRound size={18} aria-hidden="true" />
            Generate Code
          </button>
        </form>

        <div className={styles.codeList} aria-label="Generated access codes">
          {codes.map((item) => {
            const remainingSeats = Math.max(item.seats - item.used, 0);

            return (
              <article className={styles.codeCard} key={item.id}>
                <div className={styles.codeTopline}>
                  <div>
                    <span>{item.status}</span>
                    <h3>{item.label}</h3>
                  </div>
                  <button aria-label={`Copy ${item.code}`} onClick={() => copyCode(item.code)} type="button">
                    {copiedCode === item.code ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>

                <div className={styles.codeValue}>{item.code}</div>

                <div className={styles.codeMeta}>
                  <span>
                    <Users size={15} aria-hidden="true" />
                    {remainingSeats} of {item.seats} seats left
                  </span>
                  <span>
                    <CalendarClock size={15} aria-hidden="true" />
                    {item.expires}
                  </span>
                </div>

                <p>{item.note}</p>

                <div className={styles.entitlements}>
                  {fullFeatureAccess
                    .filter((feature) => item.features.includes(feature.id))
                    .map((feature) => (
                      <span key={feature.id}>{feature.label}</span>
                    ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className={styles.productionNote}>
        <ShieldCheck size={18} aria-hidden="true" />
        <p>
          Production access codes need backend validation, single-use tracking, expiration checks, and audit logs before
          they can securely unlock paid features.
        </p>
      </div>
    </section>
  );
}
