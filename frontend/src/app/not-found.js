import Link from "next/link";
import styles from "@/components/PageScaffold.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>404</p>
        <h1>That TapLex path is not active.</h1>
        <p>
          The profile, tag, or workspace you opened may have moved. Return to the TapLex
          dashboard and continue from there.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primaryAction} href="/dashboard">
            Dashboard
          </Link>
          <Link className={styles.secondaryAction} href="/">
            Home
          </Link>
        </div>
      </section>
    </main>
  );
}
