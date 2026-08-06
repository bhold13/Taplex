"use client";

import { useState } from "react";
import ShareButton from "@/components/share-button";
import { profileSkins } from "@/lib/profile-model";

const profileLinks = {
  Creator: ["Latest release", "Book a session", "Watch my story", "Contact me"],
  Barber: ["Book an appointment", "View styles", "Service menu", "Save my contact"],
  Business: ["Shop products", "Request a quote", "Our story", "Join the list"],
};

type ProfileType = keyof typeof profileLinks;

export default function Home() {
  const [profileType, setProfileType] = useState<ProfileType>("Creator");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="TapLex home">
          <span className="brand-mark">
            <img src="/taplex-logo.webp" alt="" />
          </span>
          <span className="brand-name">TapLex</span>
        </a>

        <button
          className="menu-button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>

        <nav className={menuOpen ? "nav-links open" : "nav-links"} aria-label="Main navigation">
          <a href="#product" onClick={() => setMenuOpen(false)}>Product</a>
          <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#profiles" onClick={() => setMenuOpen(false)}>Profiles</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <ShareButton className="nav-share" title="TapLex — Premium NFC Networking" text="One tap. Your whole world. Discover TapLex NFC networking." label="Share TapLex" />
          <a className="nav-login" href="/dashboard" onClick={() => setMenuOpen(false)}>My Profile</a>
        </nav>

        <div className="header-actions">
          <ShareButton className="header-share" title="TapLex — Premium NFC Networking" text="One tap. Your whole world. Discover TapLex NFC networking." label="Share" />
          <a className="header-login" href="/dashboard">My Profile</a>
          <a className="header-cta" href="/order">Shop TapLex <span>↗</span></a>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-glow" />
        <div className="hero-copy">
          <p className="eyebrow"><span /> Premium NFC networking</p>
          <h1>One Tap.<br /><em>Your Whole World.</em></h1>
          <p className="hero-description">
            TapLex NFC wristbands and tags open a customizable digital identity—built to share, grow, and make every connection count.
          </p>
          <p className="tagline">The Rolex of the Tap. <strong>Networking Never Stops.</strong></p>
          <div className="hero-actions">
            <a className="button button-gold" href="/order">Order Your TapLex <span>→</span></a>
            <a className="button button-outline" href="/signup">Create Your Page <span>↗</span></a>
          </div>
          <div className="proof-row" aria-label="TapLex benefits">
            <span><b>ϟ</b> Instant sharing</span>
            <span><b>↻</b> Always up to date</span>
            <span><b>▯</b> No app required</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="TapLex digital profile preview">
          <div className="signal-rings" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="profile-card">
            <div className="profile-topline"><span>taplex.me/bhold</span><span className="live-dot">LIVE</span></div>
            <div className="avatar">B</div>
            <h2>B-Hold da General <span className="verified">◆</span></h2>
            <p>Artist · Barber · Creator</p>
            <div className="profile-links">
              <a href="#start"><span>♫</span> Latest music <b>›</b></a>
              <a href="#start"><span>✦</span> Book a cut <b>›</b></a>
              <a href="#start"><span>▣</span> Watch my story <b>›</b></a>
              <a href="#start"><span>✉</span> Save my contact <b>›</b></a>
            </div>
            <div className="social-row"><span>◎</span><span>◉</span><span>in</span><span>♪</span></div>
            <div className="card-brand">TL <small>TapLex</small></div>
          </div>
          <div className="wristband">
            <div className="strap strap-top" />
            <div className="tag-face"><span className="mini-tl">T</span><span className="nfc-wave">)))</span></div>
            <div className="strap strap-bottom" />
          </div>
          <div className="tap-badge"><b>01</b><span>Tap to<br />connect</span></div>
        </div>
      </section>

      <section className="marquee" aria-label="TapLex uses">
        <div>CREATORS <span>✦</span> ARTISTS <span>✦</span> BARBERS <span>✦</span> STYLISTS <span>✦</span> ENTREPRENEURS <span>✦</span> NETWORKERS <span>✦</span> MUSICIANS <span>✦</span> SMALL BUSINESSES <span>✦</span> CREATORS <span>✦</span> ARTISTS <span>✦</span> BARBERS <span>✦</span> STYLISTS <span>✦</span> ENTREPRENEURS <span>✦</span> NETWORKERS <span>✦</span> MUSICIANS <span>✦</span> SMALL BUSINESSES <span>✦</span></div>
      </section>

      <section className="section how-section" id="how">
        <div className="section-heading">
          <p className="eyebrow"><span /> The TapLex difference</p>
          <h2>Turn every meeting into<br /><em>momentum.</em></h2>
          <p>Your TapLex keeps your most important links, work, and contact details one effortless tap away.</p>
        </div>
        <div className="steps-grid">
          <article><span className="step-number">01</span><div className="step-icon">⌁</div><h3>Build your profile</h3><p>Add your socials, music, booking links, contact card, videos, products, and more.</p></article>
          <article><span className="step-number">02</span><div className="step-icon">◖</div><h3>Connect your TapLex</h3><p>Link your NFC wristband or tag to one polished, mobile-first destination.</p></article>
          <article><span className="step-number">03</span><div className="step-icon">↗</div><h3>Tap. Share. Grow.</h3><p>Meet someone, let them tap, and turn real-life moments into lasting connections.</p></article>
        </div>
      </section>

      <section className="section product-section" id="product">
        <div className="product-art" aria-hidden="true">
          <div className="product-ring ring-one" />
          <div className="product-ring ring-two" />
          <div className="product-tag"><span>T</span><small>TapLex</small><i>)))</i></div>
          <div className="product-shadow" />
        </div>
        <div className="product-copy">
          <p className="eyebrow"><span /> Made to move with you</p>
          <h2>Your network,<br /><em>on your wrist.</em></h2>
          <p>Premium NFC technology meets a polished digital profile. No app, no paper cards, no missed connections.</p>
          <ul>
            <li><span>✓</span><div><b>One-tap sharing</b><small>Works with most modern smartphones.</small></div></li>
            <li><span>✓</span><div><b>Update anytime</b><small>Change your links without replacing your tag.</small></div></li>
            <li><span>✓</span><div><b>Built for your brand</b><small>A clean profile that looks like you.</small></div></li>
          </ul>
          <a className="text-link" href="#pricing">Explore TapLex products <span>→</span></a>
        </div>
      </section>

      <section className="section profile-section" id="profiles">
        <div className="profile-intro">
          <p className="eyebrow"><span /> One platform. Every lane.</p>
          <h2>Your profile should work<br />as hard as <em>you do.</em></h2>
          <p>Start with a focused layout and make it yours. TapLex is built for the many sides of your identity.</p>
          <div className="profile-tabs" role="tablist" aria-label="Profile examples">
            {(Object.keys(profileLinks) as ProfileType[]).map((type) => (
              <button
                key={type}
                role="tab"
                aria-selected={profileType === type}
                className={profileType === type ? "active" : ""}
                onClick={() => setProfileType(type)}
              >{type}</button>
            ))}
          </div>
        </div>
        <div className="template-stage">
          <div className="template-card">
            <div className="template-header"><span className="template-avatar">T</span><div><b>{profileType} Profile</b><small>@yourname</small></div></div>
            <p className="template-bio">Make the introduction. Share the work. Keep the connection.</p>
            <div className="template-links">
              {profileLinks[profileType].map((link, index) => <div key={link}><span>0{index + 1}</span>{link}<b>↗</b></div>)}
            </div>
            <small className="powered">Powered by TapLex</small>
          </div>
          <div className="edit-pill">● Live preview</div>
        </div>
      </section>

      <section className="section skins-section" id="skins">
        <div className="skins-heading">
          <div>
            <p className="eyebrow"><span /> TapLex skins</p>
            <h2>Change the mood.<br /><em>Keep your identity.</em></h2>
          </div>
          <div>
            <p>Choose a background that matches your lane, then customize your content without rebuilding your page.</p>
            <a className="text-link" href="/signup?skin=obsidian">Create your profile <span>→</span></a>
          </div>
        </div>
        <div className="skin-gallery" aria-label="TapLex skin examples">
          {profileSkins.map((skin) => (
            <a
              className={`skin-tile skin-${skin.id}`}
              href={`/signup?skin=${skin.id}`}
              aria-label={`Create a profile with ${skin.name}`}
              key={skin.id}
            >
              {skin.id === "obsidian" ? <span className="skin-badge">Signature</span> : null}
              <div className="skin-mini-profile"><b>T</b><i /><i /><i /></div>
              <h3>{skin.name}</h3>
              <p>{skin.mood}</p>
              <span className="skin-tile-action">Use this background <span>→</span></span>
            </a>
          ))}
        </div>
      </section>

      <section className="section features-section" id="features">
        <div className="section-heading centered">
          <p className="eyebrow"><span /> More than a link page</p>
          <h2>Built for real-world<br /><em>connection.</em></h2>
        </div>
        <div className="features-grid">
          <article><span>01</span><h3>Links, socials & videos</h3><p>Give every part of your work a dedicated, beautiful place instead of a generic link list.</p></article>
          <article><span>02</span><h3>Support Me</h3><p>Let supporters tap or scan a QR code for Cash App, Venmo, Zelle, PayPal, Stripe, Square, Apple Pay, or Google Pay.</p></article>
          <article><span>03</span><h3>Booking-ready services</h3><p>Show prices and service details, then send clients straight to your trusted booking provider.</p></article>
          <article><span>04</span><h3>Always current</h3><p>Keep the same NFC product while your brand, offers, contact card, and destinations evolve.</p></article>
        </div>
      </section>

      <section className="section pricing-section" id="pricing">
        <div>
          <p className="eyebrow"><span /> Start connecting</p>
          <h2>Wear the introduction.<br /><em>Own the connection.</em></h2>
        </div>
        <div className="price-card">
          <p>TapLex NFC wristband</p>
          <div className="price"><span>Each color</span><b>$50</b></div>
          <ul><li>Black, Blue, Gray, Pink & Purple</li><li>Personal TapLex profile</li><li>Setup assistance included</li><li>Update your links anytime</li></ul>
          <a className="button button-gold" href="/order">Order Your TapLex <span>→</span></a>
          <small>Secure payment and delivery details are confirmed at checkout.</small>
        </div>
      </section>

      <section className="section founder-section" id="about">
        <div className="founder-portrait" aria-label="TapLex founder B-Hold da General">
          <div className="founder-rings" aria-hidden="true"><i /><i /><i /></div>
          <div className="founder-logo"><img src="/taplex-logo.webp" alt="TapLex gold logo" /></div>
          <div className="founder-signature"><span>Founded by</span><b>B-Hold da General</b><small>Artist · Barber · Media Creator · Community Connector</small></div>
        </div>
        <div className="founder-copy">
          <p className="eyebrow"><span /> The story behind the tap</p>
          <h2>Built for people who<br /><em>never stop connecting.</em></h2>
          <p>TapLex was created by Brandon “B-Hold da General” Holden—a creative entrepreneur who knows one introduction can change everything.</p>
          <p>As an artist, barber, media creator, and community connector, he wanted one simple way to carry every part of his work without paper cards or missed opportunities. TapLex turns that idea into a premium NFC wristband or tag that shares your whole world in one tap.</p>
          <blockquote>“The Rolex of the Tap. Networking Never Stops.”</blockquote>
          <div className="founder-actions">
            <a className="button button-gold" href="mailto:bjholden13@gmail.com">Email TapLex <span>→</span></a>
            <a className="button button-outline" href="https://www.instagram.com/bholddageneral/" target="_blank" rel="noreferrer">Meet the Founder <span>↗</span></a>
          </div>
        </div>
      </section>

      <section className="final-cta" id="start">
        <img src="/taplex-logo.webp" alt="TapLex" />
        <p className="eyebrow"><span /> Your next connection is one tap away</p>
        <h2>The Rolex of the Tap.</h2>
        <p>Networking Never Stops.</p>
        <div className="hero-actions">
          <a className="button button-gold" href="/order">Start Your Order <span>→</span></a>
          <a className="button button-outline" href="/signup">Create Your Profile <span>↗</span></a>
        </div>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top"><span className="brand-mark"><img src="/taplex-logo.webp" alt="" /></span><span className="brand-name">TapLex</span></a>
        <p>Premium NFC networking for people building something real.</p>
        <div><a href="#product">Product</a><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#about">About</a><a href="/order">Store</a><a href="/dashboard">My Profile</a><a href="/admin">Owner Login</a><a href="https://www.instagram.com/bholddageneral/" target="_blank" rel="noreferrer">Contact</a></div>
        <small>© 2026 TapLex. Networking Never Stops.</small>
      </footer>
    </main>
  );
}
