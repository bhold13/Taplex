import AuthForm from "@/components/AuthForm";
import styles from "@/components/PageScaffold.module.css";

export const metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>Register</p>
          <h1>Create your TapLex account.</h1>
          <p>Create your account, claim a username, and publish your premium tap profile.</p>
        </div>
        <AuthForm mode="register" />
      </section>
    </main>
  );
}
