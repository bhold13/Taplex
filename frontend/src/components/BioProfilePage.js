import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  Globe,
  Instagram,
  Mail,
  MapPin,
  Music2,
  Phone,
  Sparkles
} from "lucide-react";

import { canUseBooking } from "@/lib/profileStore";

import DownloadContactButton from "./DownloadContactButton";
import UserGallery from "./UserGallery";
import styles from "./BioProfilePage.module.css";

function SocialIcon({ platform }) {
  if (platform === "instagram") {
    return <Instagram size={19} aria-hidden="true" />;
  }

  if (platform === "music" || platform === "media") {
    return <Music2 size={19} aria-hidden="true" />;
  }

  return <Globe size={19} aria-hidden="true" />;
}

export default function BioProfilePage({ profile }) {
  const displayName = profile.displayName || profile.username;
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const bookingIsLive = canUseBooking(profile.plan) && Boolean(profile.bookingUrl);
  const phoneIsPublic = profile.showPhoneNumber === true && Boolean(profile.phoneNumber);

  return (
    <main className={styles.profilePage} aria-label={`${displayName}'s TapLex profile`}>
      <section className={styles.heroPanel}>
        {profile.coverImageUrl ? (
          <div
            className={styles.coverImage}
            style={{ backgroundImage: `url("${profile.coverImageUrl.replaceAll('"', "%22")}")` }}
            aria-hidden="true"
          />
        ) : null}
        <div className={`${styles.heroContent} ${profile.coverImageUrl ? styles.heroContentWithCover : ""}`}>
          <div className={styles.identity}>
            <span className={styles.avatar}>
              {profile.profilePhotoUrl ? <img src={profile.profilePhotoUrl} alt="" /> : initials}
            </span>
            <div>
              <p className={styles.kicker}>
                {profile.isVerified ? <BadgeCheck size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
                {profile.isVerified ? "Verified TapLex profile" : "Premium tap profile"}
              </p>
              <h1>{displayName}</h1>
              <span className={styles.username}>@{profile.username}</span>
              {profile.bio ? <p className={styles.bio}>{profile.bio}</p> : null}
            </div>
          </div>

          <div className={styles.metaRow}>
            {profile.category ? <span>{profile.category}</span> : null}
            {profile.location ? (
              <span>
                <MapPin size={16} aria-hidden="true" />
                {profile.location}
              </span>
            ) : null}
            <span className={styles.planBadge}>{profile.plan} member</span>
          </div>

          <div className={styles.actions}>
            {profile.contactEmail ? (
              <a className={styles.primaryAction} href={`mailto:${profile.contactEmail}`}>
                <Mail size={17} aria-hidden="true" />
                Contact
              </a>
            ) : null}
            {phoneIsPublic ? (
              <a className={styles.secondaryAction} href={`tel:${profile.phoneNumber}`}>
                <Phone size={17} aria-hidden="true" />
                {profile.phoneLabel || "Call"}
              </a>
            ) : null}
            {bookingIsLive ? (
              <a className={styles.secondaryAction} href={profile.bookingUrl} target="_blank" rel="noreferrer">
                <CalendarClock size={17} aria-hidden="true" />
                Book now
              </a>
            ) : null}
            <DownloadContactButton className={styles.downloadAction} profile={profile} />
          </div>
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          {profile.socialLinks?.length ? (
            <section className={styles.contentSection} aria-labelledby="social-heading">
              <div className={styles.sectionHeading}>
                <span>Connect</span>
                <h2 id="social-heading">Social links</h2>
              </div>
              <div className={styles.socialLinks}>
                {profile.socialLinks.map((link) => (
                  <a href={link.url} key={`${link.platform}-${link.url}`} target="_blank" rel="noreferrer">
                    <SocialIcon platform={link.platform} />
                    <span>{link.label}</span>
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          {phoneIsPublic ? (
            <section className={styles.contentSection} aria-labelledby="phone-heading">
              <div className={styles.sectionHeading}>
                <span>Contact</span>
                <h2 id="phone-heading">Phone</h2>
              </div>
              <a className={styles.phoneCard} href={`tel:${profile.phoneNumber}`}>
                <span>
                  <Phone size={20} aria-hidden="true" />
                </span>
                <div>
                  <small>{profile.phoneLabel || "Phone"}</small>
                  <strong>{profile.phoneNumber}</strong>
                </div>
              </a>
            </section>
          ) : null}

          {profile.mediaLinks?.length ? (
            <section className={styles.contentSection} aria-labelledby="media-heading">
              <div className={styles.sectionHeading}>
                <span>Showcase</span>
                <h2 id="media-heading">Featured media</h2>
              </div>
              <div className={styles.mediaLinks}>
                {profile.mediaLinks.map((link) => (
                  <a href={link.url} key={`${link.label}-${link.url}`} target="_blank" rel="noreferrer">
                    <Music2 size={20} aria-hidden="true" />
                    <span>{link.label}</span>
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          {profile.galleryItems?.length ? (
            <section className={styles.contentSection} aria-labelledby="gallery-heading"><div className={styles.sectionHeading}><span>Portfolio</span><h2 id="gallery-heading">My work</h2></div><UserGallery items={profile.galleryItems} /></section>
          ) : null}

          {profile.services?.length ? (
            <section className={styles.contentSection} aria-labelledby="services-heading">
              <div className={styles.sectionHeading}>
                <span>Work with me</span>
                <h2 id="services-heading">Services</h2>
              </div>
              <div className={styles.services}>
                {profile.services.map((service) => (
                  <article key={service}>
                    <Sparkles size={18} aria-hidden="true" />
                    <h3>{service}</h3>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className={styles.connectPanel}>
          <span className={styles.panelIcon}>
            <Sparkles size={21} aria-hidden="true" />
          </span>
          <h2>Connect with {displayName}</h2>
          <p>Reach out directly about services, collaborations, or the next opportunity.</p>
          {profile.contactEmail ? (
            <a className={styles.primaryAction} href={`mailto:${profile.contactEmail}`}>
              <Mail size={17} aria-hidden="true" />
              Send an email
            </a>
          ) : null}
          {phoneIsPublic ? (
            <a className={styles.secondaryAction} href={`tel:${profile.phoneNumber}`}>
              <Phone size={17} aria-hidden="true" />
              Call {profile.phoneLabel || "now"}
            </a>
          ) : null}
          {bookingIsLive ? (
            <a className={styles.secondaryAction} href={profile.bookingUrl} target="_blank" rel="noreferrer">
              <CalendarClock size={17} aria-hidden="true" />
              Book an appointment
            </a>
          ) : null}
          <Link className={styles.buildLink} href="/profile-builder">
            Create your TapLex
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </main>
  );
}
