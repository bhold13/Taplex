import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PwaRuntime from "@/components/pwa/pwa-runtime";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://taplex.co"),
  title: "TapLex | The Rolex of the Tap",
  description: "Premium NFC wristbands and digital profiles built to make every connection count. Networking Never Stops.",
  applicationName: "TapLex",
  alternates: { canonical: "/" },
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    title: "TapLex",
    statusBarStyle: "black-translucent",
  },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: [
      { url: "/pwa/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/pwa/icon-96x96.png",
    apple: [{ url: "/pwa/icon-180x180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
  themeColor: "#D4AF37",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" sizes="180x180" href="/pwa/icon-180x180.png" />
        <link rel="apple-touch-startup-image" href="/pwa/apple-splash-1170x2532.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="pwa-launch-splash" aria-hidden="true">
          <img src="/pwa/icon-512x512.png" alt="" />
          <b>TAPLEX</b>
          <span className="pwa-launch-loader"><i /><i /><i /></span>
        </div>
        {children}
        <PwaRuntime />
      </body>
    </html>
  );
}
