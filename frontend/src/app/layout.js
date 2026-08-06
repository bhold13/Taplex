import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata = {
  metadataBase: new URL("https://taplex.co"),
  title: { default: "TapLex | Tap Once. Networking Never Stops.", template: "%s | TapLex" },
  description: "Share your profile, contact details, links, music, and services with one premium TapLex NFC wristband. No app required.",
  openGraph: { title: "TapLex | Tap Once. Networking Never Stops.", description: "Premium NFC wristbands built for real-world connections.", url: "https://taplex.co", siteName: "TapLex", type: "website" },
  twitter: { card: "summary_large_image", title: "TapLex | Tap Once. Networking Never Stops.", description: "Premium NFC wristbands built for real-world connections." },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "TapLex", url: "https://taplex.co", slogan: "Tap Once. Networking never stops." }) }} />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
