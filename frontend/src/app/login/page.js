import AuthForm from "@/components/AuthForm";
import styles from "@/components/PageScaffold.module.css";

export const metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>Login</p>
          <h1>Welcome back to TapLex.</h1>
          <p>Manage your public profile, contact details, media, services, and upgrade path.</p>
        </div>
        <AuthForm mode="login" />
      </section>
    </main>
  );
}
