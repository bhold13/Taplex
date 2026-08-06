import Link from "next/link";

export const dynamic = "force-dynamic";

export default function OrderSuccessPage() {
  return (
    <main className="success-shell">
      <section className="success-card">
        <div className="launch-mark"><span>✓</span></div>
        <p className="eyebrow"><span /> Payment received</p>
        <h1>Your TapLex order<br />is <em>confirmed.</em></h1>
        <p>Stripe has securely processed your payment. TapLex will use the checkout contact details to follow up about activation and delivery.</p>
        <div className="success-actions">
          <Link className="button button-gold" href="/signup">Build Your Profile <span>→</span></Link>
          <Link className="button button-outline" href="/">Return Home</Link>
        </div>
        <small>Do not share your checkout confirmation or payment details with anyone claiming to be TapLex support.</small>
      </section>
    </main>
  );
}
