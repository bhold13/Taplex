"use client";

import Link from "next/link";
import ShareButton from "@/components/share-button";
import SocialGlyph from "@/components/customer/social-glyph";
import { readApiResponse } from "@/lib/client-response";
import { useState, type FormEvent } from "react";
import SupportQr from "@/components/customer/support-qr";
import SaveConnectionButton from "@/components/customer/save-connection-button";
import { bookingProviderName, profileImageUrl, profileLocationLabel, supportPlatforms, supportQrValue, videoEmbedUrl, type TapLexLink, type TapLexProfile } from "@/lib/profile-model";

export default function PublicProfile({ profile, isOwner = false, isSignedIn = false }: { profile: TapLexProfile; isOwner?: boolean; isSignedIn?: boolean }) {
  const [selectedService, setSelectedService] = useState<TapLexLink | null>(null);
  const avatar = profileImageUrl(profile.avatarKey);
  const socials = profile.links.filter((link) => link.kind === "social" && link.active);
  const links = profile.links.filter((link) => link.kind === "link" && link.active);
  const videos = profile.links.filter((link) => link.kind === "video" && link.active);
  const supportLinks = profile.links.filter((link) => link.kind === "support" && link.active);
  const bookings = profile.links.filter((link) => link.kind === "booking" && link.active);
  const location = profileLocationLabel(profile);

  return (
    <main className={`public-profile public-skin-${profile.skin}`}>
      <div className="public-profile-texture" aria-hidden="true" />
      <header className="public-profile-header">
        <Link className="public-profile-brand" href="/" aria-label="TapLex home"><span><img src="/taplex-logo.webp" alt="" /></span><b>TAPLEX</b></Link>
        <div className="public-profile-header-actions">{isOwner ? <Link className="public-owner-edit" href="/dashboard">Edit My Profile</Link> : null}<ShareButton className="public-share-button" url={`/p/${profile.handle}`} title={`${profile.displayName} on TapLex`} text={profile.headline || `Connect with ${profile.displayName} on TapLex.`} label="Share" /></div>
      </header>

      <section className="public-profile-content">
        <div className="public-avatar-wrap"><div className="public-signal-rings" aria-hidden="true"><i /><i /><i /></div><span className="public-avatar">{avatar ? <img src={avatar} alt={`${profile.displayName} profile`} /> : <b>{profile.displayName.trim().charAt(0).toUpperCase() || "T"}</b>}</span></div>
        <h1>{profile.displayName}</h1>
        <p className="public-handle">@{profile.handle}</p>
        {location ? <p className="public-location"><span aria-hidden="true">⌖</span>{location}</p> : null}
        {profile.headline ? <h2>{profile.headline}</h2> : null}
        {profile.bio ? <p className="public-bio">{profile.bio}</p> : null}
        {!isOwner ? <SaveConnectionButton handle={profile.handle} signedIn={isSignedIn} /> : null}

        {socials.length ? <nav className={`public-socials social-icons-${profile.socialIconStyle}`} aria-label={`${profile.displayName} social profiles`}>{socials.map((link) => <a key={link.id} data-platform={link.platform} href={link.url} target="_blank" rel="noreferrer" aria-label={link.title} title={link.title}><SocialGlyph platform={link.platform} /></a>)}</nav> : null}

        <div className="public-links">
          {links.map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer"><span className="public-link-icon">{linkIcon(link.platform)}</span><b>{link.title}</b><i aria-hidden="true">›</i></a>)}
          {profile.contactEmail || profile.contactPhone ? <a href={`/p/${profile.handle}/contact`}><span className="public-link-icon">VC</span><b>Save my contact</b><i aria-hidden="true">›</i></a> : null}
        </div>

        {videos.length ? <section className="public-module public-video-module">
          <div className="public-module-heading"><span>Watch</span><small>{videos.length} video{videos.length === 1 ? "" : "s"}</small></div>
          <div className="public-video-grid">{videos.map((video) => <VideoCard key={video.id} video={video} />)}</div>
        </section> : null}

        {profile.gallery.length ? <section className="public-module public-gallery-module"><div className="public-module-heading"><span>My work</span><small>{profile.gallery.length} photo{profile.gallery.length === 1 ? "" : "s"}</small></div><div className="public-gallery-grid">{profile.gallery.map((item, index) => <a key={item.id} href={profileImageUrl(item.imageKey)} target="_blank" rel="noreferrer"><img src={profileImageUrl(item.imageKey)} alt={item.altText || item.caption || `Work sample ${index + 1}`} loading="lazy" /><span>{item.caption || "Work sample"}</span></a>)}</div></section> : null}

        {supportLinks.length ? <section className="public-module public-support-module">
          <div className="public-module-heading"><span>Support me</span><small>Scan or tap to send a tip</small></div>
          <div className="public-support-grid">{supportLinks.map((support) => <SupportCard key={support.id} link={support} />)}</div>
        </section> : null}

        {bookings.length ? <section className="public-module public-booking-module">
          <div className="public-module-heading"><span>Book with me</span><small>Services & appointments</small></div>
          <div className="public-booking-grid">{bookings.map((service) => <article key={service.id}>
            <div className="public-booking-top"><span>Service</span><small>{bookingProviderName(service.platform)}</small></div>
            <h3>{service.title}</h3>
            {service.description ? <p>{service.description}</p> : null}
            <div className="public-service-meta">{service.priceLabel ? <b>{service.priceLabel}</b> : null}{service.durationMinutes ? <span>{service.durationMinutes} min</span> : null}</div>
            {service.platform === "taplex" ? <button type="button" onClick={() => setSelectedService(service)}>Request a time <span>→</span></button> : <a href={service.url} target="_blank" rel="noreferrer">Book now <span>↗</span></a>}
          </article>)}</div>
          <p className="public-booking-note"><b>TapLex Pro-ready</b> · Direct requests stay in TapLex; connected services open their provider.</p>
        </section> : null}
        <Link className="public-powered" href="/">Powered by <b>TapLex</b></Link>
      </section>
      {selectedService ? <NativeBookingModal profileHandle={profile.handle} service={selectedService} onClose={() => setSelectedService(null)} /> : null}
    </main>
  );
}

const BOOKING_TIMES = Array.from({ length: 25 }, (_, index) => {
  const totalMinutes = 8 * 60 + index * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const label = `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
  return { value, label };
});

function NativeBookingModal({ profileHandle, service, onClose }: { profileHandle: string; service: TapLexLink; onClose: () => void }) {
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [dateLimits] = useState(() => {
    const now = new Date();
    return { today: now.toISOString().slice(0, 10), lastDate: new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) };
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/public/bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: profileHandle, serviceId: service.id, requestedDate: form.get("requestedDate"), requestedTime: form.get("requestedTime"), customerName: form.get("customerName"), customerEmail: form.get("customerEmail"), customerPhone: form.get("customerPhone"), notes: form.get("notes"), website: form.get("website") }),
      });
      const data = await readApiResponse<{ message?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Booking request could not be sent.");
      setState("success");
      setMessage(data.message ?? "Your booking request was sent.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Booking request could not be sent.");
    }
  }

  return <div className="booking-modal-backdrop" role="presentation">
    <section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title">
      <button className="booking-modal-close" type="button" onClick={onClose} aria-label="Close booking form">×</button>
      {state === "success" ? <div className="booking-success"><span>✓</span><h2>Request sent</h2><p>{message}</p><small>The creator will contact you to confirm the requested time.</small><button type="button" onClick={onClose}>Done</button></div> : <>
        <small className="booking-modal-eyebrow">TAPLEX BOOKING</small><h2 id="booking-modal-title">Request {service.title}</h2>
        <div className="booking-modal-service">{service.priceLabel ? <b>{service.priceLabel}</b> : null}{service.durationMinutes ? <span>{service.durationMinutes} min</span> : null}</div>
        <p>Choose a preferred time. Your appointment is confirmed only after the creator accepts it.</p>
        <form onSubmit={submit}>
          <div className="booking-modal-fields"><label><span>Date</span><input name="requestedDate" type="date" min={dateLimits.today} max={dateLimits.lastDate} required /></label><label><span>Time</span><select name="requestedTime" defaultValue="" required><option value="" disabled>Choose a time</option>{BOOKING_TIMES.map((time) => <option key={time.value} value={time.value}>{time.label}</option>)}</select></label></div>
          <label><span>Name</span><input name="customerName" autoComplete="name" maxLength={80} required placeholder="Your name" /></label>
          <div className="booking-modal-fields"><label><span>Email</span><input name="customerEmail" type="email" autoComplete="email" maxLength={120} placeholder="you@example.com" /></label><label><span>Phone</span><input name="customerPhone" type="tel" autoComplete="tel" maxLength={32} placeholder="(555) 555-0123" /></label></div>
          <label><span>Notes</span><textarea name="notes" maxLength={400} placeholder="Anything the creator should know?" /></label>
          <label className="booking-honeypot" aria-hidden="true"><span>Website</span><input name="website" tabIndex={-1} autoComplete="off" /></label>
          {message ? <p className="booking-modal-error" role="alert">{message}</p> : null}
          <button className="booking-modal-submit" type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send booking request"}<span>→</span></button>
          <small className="booking-modal-footnote">Add an email or phone so the creator can confirm with you.</small>
        </form>
      </>}
    </section>
  </div>;
}

function VideoCard({ video }: { video: TapLexLink }) {
  const embedUrl = videoEmbedUrl(video.platform, video.url);
  const platformName = video.platform === "youtube" ? "YouTube" : video.platform === "vimeo" ? "Vimeo" : "TikTok";
  if (!embedUrl) return <a className="public-video-fallback" href={video.url} target="_blank" rel="noreferrer"><span className="public-video-play">▶</span><span><small>{platformName}</small><b>{video.title}</b></span><i>↗</i></a>;

  return <article className={`public-video-card public-video-${video.platform}`}>
    <div className="public-video-player">
      <iframe
        src={embedUrl}
        title={`${video.title} on ${platformName}`}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
      />
    </div>
    <div className="public-video-caption"><span><small>{platformName}</small><b>{video.title}</b></span><a href={video.url} target="_blank" rel="noreferrer" aria-label={`Open ${video.title} on ${platformName}`}>Open ↗</a></div>
  </article>;
}

function SupportCard({ link }: { link: TapLexLink }) {
  const [copied, setCopied] = useState(false);
  const platform = supportPlatforms.find((item) => item.id === link.platform);
  const qrValue = supportQrValue(link.platform, link.description, link.url);

  async function copyRecipient() {
    let copiedSuccessfully = false;
    try {
      await navigator.clipboard.writeText(link.description);
      copiedSuccessfully = true;
    } catch {
      const field = document.createElement("textarea");
      field.value = link.description;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      copiedSuccessfully = document.execCommand("copy");
      field.remove();
    }
    if (copiedSuccessfully) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  return <article>
    <div><span className="support-app-mark">{platform?.mark ?? "$"}</span><span><b>{platform?.name ?? link.title}</b><small>{link.description}</small></span></div>
    <SupportQr value={qrValue} label={`${platform?.name ?? link.title} ${link.description}`} />
    {link.platform === "zelle" ? <button type="button" onClick={() => void copyRecipient()}>{copied ? "Copied" : platform?.action ?? "Copy details"}<span>{copied ? "✓" : "□"}</span></button> : <a href={link.url} target="_blank" rel="noreferrer">{platform?.action ?? "Send support"}<span>↗</span></a>}
  </article>;
}

function linkIcon(platform: string) {
  const icons: Record<string, string> = { music: "♫", calendar: "□", video: "▶", shop: "◇", email: "@", website: "↗" };
  return icons[platform] ?? "↗";
}
