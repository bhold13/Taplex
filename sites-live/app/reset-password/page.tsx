import Link from "next/link";
import NewPasswordForm from "@/components/customer/new-password-form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = String((await searchParams).token ?? "").slice(0, 180);
  return <main className="auth-shell">
    <header className="auth-header">
      <Link className="auth-brand" href="/" aria-label="TapLex home"><span className="auth-brand-mark"><img src="/taplex-logo.webp" alt="" /></span><span>TAPLEX</span></Link>
      <Link className="auth-back" href="/login">Back to login <span aria-hidden="true">→</span></Link>
    </header>
    <section className="auth-layout">
      <div className="auth-intro"><h1>Choose a new<br /><em>password.</em></h1><p>Create a strong password for your TapLex account. After it’s updated, we’ll securely sign you in.</p><i aria-hidden="true" /></div>
      <div className="auth-card"><h2>New password</h2><p>Use at least 10 characters.</p><NewPasswordForm token={token} /></div>
    </section>
  </main>;
}
