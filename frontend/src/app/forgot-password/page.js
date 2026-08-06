import AuthForm from "@/components/AuthForm";
import styles from "@/components/PageScaffold.module.css";

export const metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>Account Recovery</p>
          <h1>Reset your TapLex password.</h1>
          <p>Firebase Authentication handles password reset delivery and session protection.</p>
        </div>
        <AuthForm mode="forgot" />
      </section>
    </main>
  );
}
