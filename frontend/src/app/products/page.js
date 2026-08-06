import Link from "next/link";
import { BadgeCheck, Box, Nfc, RotateCcw, ShieldCheck, Smartphone } from "lucide-react";
import styles from "./products.module.css";

export const metadata = { title: "Official NFC Wristband", description: "Meet the official $40 TapLex NFC wristband. Share your digital profile with one tap—no app required." };

const included = ["Official TapLex NFC wristband", "Free TapLex digital profile", "Guided activation", "Profile updates anytime", "Setup support"];

export default function ProductsPage() {
  return <main className={styles.page}>
    <section className={styles.product}>
      <div className={styles.gallery}><div className={styles.band} aria-label="Black TapLex NFC wristband product preview"><span>TAPLEX</span><i /></div><p>Official TapLex wristband · Black</p></div>
      <div className={styles.details}><p className={styles.category}>Official TapLex</p><h1>NFC Wristband</h1><p className={styles.price}>$40</p><p className={styles.lead}>Your profile, your work, and your contact details—ready to share with one tap.</p>
        <div className={styles.stock}><span /> Available</div>
        <fieldset><legend>Color</legend><button type="button" className={styles.swatch} aria-pressed="true"><span /> Black</button></fieldset>
        <Link className={styles.buy} href="/contact?intent=order">Get Your TapLex</Link>
        <p className={styles.checkout}><ShieldCheck size={16} /> Secure order request · Setup support included</p>
        <ul>{included.map(item=><li key={item}><BadgeCheck size={17}/>{item}</li>)}</ul>
      </div>
    </section>
    <section className={styles.benefits} aria-label="Product benefits"><article><Smartphone/><h2>No app required</h2><p>Tap with most modern smartphones.</p></article><article><Nfc/><h2>Reusable connection</h2><p>Update your profile without replacing the wristband.</p></article><article><Box/><h2>Ready to activate</h2><p>Claim your TapLex and start sharing in minutes.</p></article><article><RotateCcw/><h2>Built for everyday use</h2><p>Simple, wearable, and always ready.</p></article></section>
    <section className={styles.faq}><h2>Before you tap</h2><details><summary>How does TapLex work?</summary><p>A compatible phone reads the NFC chip and opens your TapLex profile in the browser. The other person does not need an app.</p></details><details><summary>Can I change my profile later?</summary><p>Yes. Your wristband stays the same while your links, bio, services, and contact details can be updated.</p></details><details><summary>What comes with my wristband?</summary><p>Your official wristband includes a free TapLex profile, guided activation, and setup support.</p></details><details><summary>When will my order ship?</summary><p>Current shipping timing is confirmed during your order request so you receive an accurate estimate.</p></details></section>
  </main>;
}
