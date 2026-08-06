export default function SocialGlyph({ platform }: { platform: string }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, "data-platform": platform };
  if (platform === "instagram") return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" /></svg>;
  if (platform === "tiktok") return <svg {...common}><path d="M14 3v11.2a4.5 4.5 0 1 1-3.5-4.4" /><path d="M14 3c.7 3.2 2.6 4.9 5.5 5.2" /></svg>;
  if (platform === "facebook") return <svg {...common}><path d="M14 22v-8h3l.7-4H14V8.5c0-1.2.4-2 2.1-2H18V3.2c-.6-.1-1.7-.2-3-.2-3.1 0-5 1.9-5 5.2V10H7v4h3v8" fill="currentColor" stroke="none" /></svg>;
  if (platform === "youtube") return <svg {...common}><rect x="2.5" y="5" width="19" height="14" rx="4" /><path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" /></svg>;
  if (platform === "x") return <svg {...common}><path d="M4 4l16 16M20 4 4 20" /></svg>;
  if (platform === "linkedin") return <svg {...common}><rect x="3" y="9" width="4" height="12" /><circle cx="5" cy="5" r="2" /><path d="M11 21V9h4v2c1-1.5 2.3-2.3 4-2 1.6.3 2 1.8 2 4v8h-4v-7c0-1.3-.5-2-1.5-2S15 13 15 14v7h-4Z" /></svg>;
  if (platform === "spotify") return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M7 9.4c3.8-1.1 7.8-.7 11 .9M7.8 13c3.2-.8 6.4-.4 9.2.8M8.7 16.2c2.5-.5 5-.2 7.2.7" /></svg>;
  if (platform === "apple-music") return <svg {...common}><path d="M9 18V6l10-2v11" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="15" r="2.5" /></svg>;
  if (platform === "bandcamp") return <svg {...common}><path d="M7.1 7h13.4l-3.6 10H3.5L7.1 7Z" fill="currentColor" stroke="none" /></svg>;
  if (platform === "audiomack") return <svg {...common}><path d="M3 15.5h2.2l1.4-6 2.1 9 2.2-13 2.3 12 1.8-8 1.5 6h4.5" /><path d="M4 20h16" /></svg>;
  if (platform === "soundcloud") return <svg {...common}><path d="M3 16v-3M6 18V11M9 18V9M12 18V7M12 15a5 5 0 0 1 9 3H12" /></svg>;
  if (platform === "whatsapp") return <svg {...common}><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z" /><path d="M9 8.5c.7 3 2.2 4.6 5.5 6" /></svg>;
  if (platform === "threads") return <svg {...common}><path d="M17.8 10.5c-.5-4-2.7-6.2-6.2-6.2-4.4 0-7.1 3.2-7.1 7.7s2.7 7.7 7.2 7.7c3.7 0 6.2-2.1 6.2-5.1 0-2.7-2-4.3-5-4.3-2.6 0-4.4 1.2-4.4 3.1 0 1.6 1.4 2.7 3.2 2.7 2.6 0 4.5-2.1 4.5-5.1" /></svg>;
  return <span className="social-glyph-text">{platform.slice(0, 2).toUpperCase()}</span>;
}
