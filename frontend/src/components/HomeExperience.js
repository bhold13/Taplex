import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, ChartNoAxesCombined, Nfc, ShieldCheck, Sparkles, Zap } from "lucide-react";

import styles from "./HomeExperience.module.css";
import EmailSignup from "./EmailSignup";

const benefits = [
  { title: "One tap. No app.", text: "Share your profile, contact details, links, music, services, and more from one wristband.", Icon: Nfc },
  { title: "Made to be remembered", text: "A premium black-and-gold look that starts conversations before you say a word.", Icon: Sparkles },
  { title: "Update anytime", text: "Change your TapLex profile without replacing your wristband or printing another card.", Icon: Zap }
];

const audiences = ["Creators", "Barbers", "Artists", "Small businesses", "Events", "Sales teams"];

export default function HomeExperience() {
  return (
    <main className={styles.home}>
      <section className={styles.hero}>
        <div className={styles.copy}>
          <h1>Tap Once.<br />Networking never stops.</h1>
          <p>
            TapLex turns a premium NFC wristband into your always-ready digital profile.
            Share who you are, what you do, and how to reach you—with one tap.
          </p>
          <div className={styles.actions}>
            <Link href="/products" className={styles.primary}>Get Your TapLex <ArrowRight size={18} /></Link>
            <Link href="/activate" className={styles.secondary}>Activate Your TapLex</Link>
          </div>
          <div className={styles.trustRow} aria-label="TapLex purchase benefits">
            <span><BadgeCheck size={16} aria-hidden="true" /> No app required</span>
            <span>Free profile included</span>
            <span>Secure checkout</span>
          </div>
        </div>
        <div className={styles.visual}>
          <Image src="/taplex-logo-dark.png" alt="TapLex premium NFC wristband brand" width={720} height={720} priority sizes="(max-width: 960px) 100vw, 45vw" />
          <div className={styles.cardOverlay}><span>Official TapLex wristband</span><strong>$40</strong></div>
        </div>
      </section>

      <section className={styles.proofStrip} aria-label="TapLex guarantee and support">
        <span><ShieldCheck size={18} /> Satisfaction promise</span>
        <span><Nfc size={18} /> Works with most modern phones</span>
        <span><BadgeCheck size={18} /> Setup support included</span>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <h2>Your best introduction, always on hand.</h2>
          <p>Stop searching for a card or spelling out your username. TapLex makes every introduction fast, polished, and easy to remember.</p>
        </div>
        <div className={styles.lanes}>
          {benefits.map(({ title, text, Icon }) => (
            <article key={title} className={styles.lane}><Icon size={24} /><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section className={styles.flow}>
        <div>
          <h2>From wrist to connection in seconds.</h2>
          <ol>
            <li><span>01</span><div><strong>Wear it</strong><p>Your TapLex stays ready wherever you go.</p></div></li>
            <li><span>02</span><div><strong>Tap it</strong><p>Hold it near a compatible phone—no app needed.</p></div></li>
            <li><span>03</span><div><strong>Share instantly</strong><p>Your profile opens with your links, contact details, and work.</p></div></li>
          </ol>
        </div>
        <div className={styles.profilePreview}>
          <ChartNoAxesCombined size={28} />
          <span>Built for growth</span>
          <h3>Your profile grows with you.</h3>
          <p>Start free. Upgrade to TapLex Pro for advanced insights, more profiles, custom branding, and priority support.</p>
          <Link href="/pricing">Compare plans <ArrowRight size={16} /></Link>
        </div>
      </section>

      <section className={styles.audiences}>
        <p>Made for real-world connections</p>
        <div>{audiences.map((audience) => <span key={audience}>{audience}</span>)}</div>
      </section>

      <section className={styles.finalCta}>
        <div><h2>Make your next connection count.</h2><p>Get the official TapLex NFC wristband and build your free profile today.</p></div>
        <Link href="/products" className={styles.primary}>Get Your TapLex <ArrowRight size={18} /></Link>
      </section>

      <EmailSignup sourcePage="homepage" />

      <div className={styles.mobileCta}><Link href="/products">Get Your TapLex — $40</Link></div>
    </main>
  );
}
