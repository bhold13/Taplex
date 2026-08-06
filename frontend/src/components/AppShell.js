import Image from "next/image";
import Link from "next/link";
import { LayoutDashboard, Search, Settings, ShieldCheck, UserRoundPen } from "lucide-react";

import AuthStatus from "./AuthStatus";
import styles from "./AppShell.module.css";

const mainNav = [
  { href: "/products", label: "Wristbands" },
  { href: "/features", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/support", label: "Support" }
];

const workspaceNav = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/profile-builder", label: "Profile", Icon: UserRoundPen },
  { href: "/discover", label: "Discover", Icon: Search },
  { href: "/settings", label: "Settings", Icon: Settings },
  { href: "/admin-dashboard", label: "Admin", Icon: ShieldCheck }
];

export default function AppShell({ children }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="TapLex home">
          <Image
            src="/taplex-logo-dark.png"
            alt=""
            width={142}
            height={56}
            className={styles.brandLogo}
            priority
          />
          <span className="sr-only">TapLex</span>
        </Link>
        <nav className={styles.mainNav} aria-label="Main navigation">
          {mainNav.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <AuthStatus />
      </header>
      <div className={styles.announcement}>Free TapLex profile included with every wristband <Link href="/products">Shop now →</Link></div>
      <nav className={styles.workspaceNav} aria-label="Workspace navigation">
        {workspaceNav.map(({ href, label, Icon }) => (
          <Link href={href} key={href} className={styles.navItem} title={label}>
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
