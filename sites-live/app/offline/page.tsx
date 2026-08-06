import Link from "next/link";

export const metadata = {
  title: "Offline | TapLex",
  description: "TapLex is temporarily offline.",
};

export default function OfflinePage() {
  return (
    <main className="offline-shell">
      <section className="offline-card">
        <div className="offline-logo"><img src="/pwa/icon-192x192.png" alt="TapLex" /></div>
        <p className="eyebrow"><span /> TapLex offline mode</p>
        <h1>Your network is still with you.</h1>
        <p>TapLex cannot reach the internet right now. Previously opened public profiles may still be available, and everything will reconnect automatically when your signal returns.</p>
        <div><Link className="button button-gold" href="/">Try Again <span>→</span></Link><Link className="button button-outline" href="/dashboard">Open My TapLex</Link></div>
        <small>The Rolex of the Tap. Networking Never Stops.</small>
      </section>
    </main>
  );
}
