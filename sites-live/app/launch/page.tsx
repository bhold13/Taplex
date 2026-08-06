import Link from "next/link";

export default function LaunchPage() {
  return (
    <main className="launch-shell">
      <header className="signup-header">
        <Link className="brand" href="/" aria-label="TapLex home">
          <span className="brand-mark"><img src="/taplex-logo.webp" alt="" /></span>
          <span className="brand-name">TapLex</span>
        </Link>
        <div className="signup-steps" aria-label="Profile progress"><span className="done">01 Profile</span><i /><span className="done">02 Design</span><i /><span className="active">03 Activate</span></div>
        <Link className="signup-exit" href="/dashboard">Back to editor</Link>
      </header>
      <section className="launch-content">
        <div className="launch-mark"><span>✓</span></div>
        <p className="eyebrow"><span /> Profile design complete</p>
        <h1>Your TapLex is ready<br />for <em>activation.</em></h1>
        <p>Your profile is saved securely to your account. The next step is pairing your physical TapLex wristband and publishing your customer page.</p>
        <div className="activation-grid">
          <article><b>01</b><h2>Confirm your design</h2><p>Review your public name, handle, headline, and selected skin.</p></article>
          <article><b>02</b><h2>Get your TapLex</h2><p>Order or activate a premium NFC wristband with TapLex support.</p></article>
          <article><b>03</b><h2>Tap and connect</h2><p>Your NFC product opens your profile instantly—no visitor app required.</p></article>
        </div>
        <div className="launch-actions">
          <Link className="button button-gold" href="/order">Order & Request Activation <span>→</span></Link>
          <Link className="button button-outline" href="/dashboard">Edit My Profile <span>←</span></Link>
        </div>
        <p className="launch-disclaimer">TapLex will never ask you to place passwords, government IDs, or payment-card information inside a public profile.</p>
      </section>
    </main>
  );
}
