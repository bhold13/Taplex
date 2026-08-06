import Link from "next/link";
import PasswordResetRequest from "@/components/customer/password-reset-request";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return <main className="auth-shell">
    <header className="auth-header">
      <Link className="auth-brand" href="/" aria-label="TapLex home"><span className="auth-brand-mark"><img src="/taplex-logo.webp" alt="" /></span><span>TAPLEX</span></Link>
      <Link className="auth-back" href="/login">Back to login <span aria-hidden="true">→</span></Link>
    </header>
    <section className="auth-layout">
      <div className="auth-intro"><h1>Get back to<br />your <em>TapLex.</em></h1><p>Enter the email used for your TapLex account. We’ll securely connect your original, Google, and password access to one profile—without losing your page.</p><i aria-hidden="true" /></div>
      <div className="auth-card"><h2>Reset password</h2><p>The reset link expires after 30 minutes.</p><PasswordResetRequest /></div>
    </section>
  </main>;
}
