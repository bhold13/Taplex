export const profileSkins = [
  { id: "obsidian", name: "Obsidian Gold", mood: "Luxury · Timeless" },
  { id: "royal", name: "Royal Purple", mood: "Creator · Bold" },
  { id: "ocean", name: "Pacific Flow", mood: "Clean · Calm" },
  { id: "sunset", name: "Golden Hour", mood: "Warm · Energetic" },
  { id: "emerald", name: "Emerald Status", mood: "Business · Premium" },
  { id: "cosmic", name: "Cosmic Signal", mood: "Future · Electric" },
  { id: "rose", name: "Rose Quartz", mood: "Soft · Stylish" },
  { id: "canvas", name: "Clean Canvas", mood: "Minimal · Focused" },
] as const;

export const socialPlatforms = [
  { id: "instagram", name: "Instagram", mark: "IG", entry: "handle", placeholder: "@username" },
  { id: "tiktok", name: "TikTok", mark: "TT", entry: "handle", placeholder: "@username" },
  { id: "facebook", name: "Facebook", mark: "f", entry: "handle", placeholder: "@username or page name" },
  { id: "youtube", name: "YouTube", mark: "YT", entry: "handle", placeholder: "@channel" },
  { id: "x", name: "X", mark: "X", entry: "handle", placeholder: "@username" },
  { id: "linkedin", name: "LinkedIn", mark: "in", entry: "handle", placeholder: "@profile-name or full URL" },
  { id: "spotify", name: "Spotify", mark: "SP", entry: "url", placeholder: "Paste Spotify profile URL" },
  { id: "apple-music", name: "Apple Music", mark: "AM", entry: "url", placeholder: "Paste Apple Music URL" },
  { id: "bandcamp", name: "Bandcamp", mark: "BC", entry: "handle", placeholder: "@artist or Bandcamp URL" },
  { id: "audiomack", name: "Audiomack", mark: "AU", entry: "handle", placeholder: "@artist or Audiomack URL" },
  { id: "soundcloud", name: "SoundCloud", mark: "SC", entry: "handle", placeholder: "@username" },
  { id: "twitch", name: "Twitch", mark: "TW", entry: "handle", placeholder: "@username" },
  { id: "snapchat", name: "Snapchat", mark: "SN", entry: "handle", placeholder: "@username" },
  { id: "threads", name: "Threads", mark: "TH", entry: "handle", placeholder: "@username" },
  { id: "whatsapp", name: "WhatsApp", mark: "WA", entry: "phone", placeholder: "+1 555 123 4567" },
  { id: "website", name: "Website", mark: "↗", entry: "url", placeholder: "https://yourwebsite.com" },
] as const;

export const videoPlatforms = [
  { id: "youtube", name: "YouTube", placeholder: "https://youtube.com/watch?v=..." },
  { id: "vimeo", name: "Vimeo", placeholder: "https://vimeo.com/..." },
  { id: "tiktok", name: "TikTok video", placeholder: "https://tiktok.com/@you/video/..." },
] as const;

export type SupportPlatform = {
  id: string;
  name: string;
  placeholder: string;
  action: string;
  mark: string;
  entry: "handle" | "recipient" | "url";
  help: string;
  setupUrl?: string;
};

export const supportPlatforms: readonly SupportPlatform[] = [
  { id: "cashapp", name: "Cash App", placeholder: "$cashtag", action: "Pay with Cash App", mark: "$", entry: "handle", help: "Type only your $cashtag." },
  { id: "venmo", name: "Venmo", placeholder: "@username", action: "Pay with Venmo", mark: "V", entry: "handle", help: "Type only your @username." },
  { id: "zelle", name: "Zelle", placeholder: "Email or phone used with Zelle", action: "Copy Zelle details", mark: "Z", entry: "recipient", help: "Visitors can scan or copy your enrolled email or phone." },
  { id: "paypal", name: "PayPal", placeholder: "@username or paypal.me link", action: "Pay with PayPal", mark: "P", entry: "handle", help: "Type your PayPal.Me username or paste the full link.", setupUrl: "https://www.paypal.com/paypalme/" },
  { id: "stripe", name: "Stripe Payment Link", placeholder: "https://buy.stripe.com/...", action: "Open secure checkout", mark: "S", entry: "url", help: "Paste a Stripe Payment Link. Eligible checkouts can show Apple Pay automatically.", setupUrl: "https://dashboard.stripe.com/payment-links" },
  { id: "square-pay", name: "Square Payment Link", placeholder: "https://square.link/u/...", action: "Open secure checkout", mark: "SQ", entry: "url", help: "Paste a Square Online Checkout link.", setupUrl: "https://squareup.com/dashboard/payment-links" },
  { id: "apple-pay", name: "Apple Pay Checkout", placeholder: "Paste an Apple Pay-enabled Stripe or Square link", action: "Pay with Apple Pay", mark: "AP", entry: "url", help: "Paste a Stripe or Square checkout where you enabled Apple Pay." },
  { id: "google-pay", name: "Google Pay Checkout", placeholder: "Paste a Google Pay-enabled Stripe or Square link", action: "Pay with Google Pay", mark: "GP", entry: "url", help: "Paste a Stripe or Square checkout where you enabled Google Pay." },
] as const;

export const bookingProviders = [
  { id: "taplex", name: "TapLex Booking", connectUrl: "" },
  { id: "booksy", name: "Booksy", connectUrl: "https://biz.booksy.com/" },
  { id: "calendly", name: "Calendly", connectUrl: "https://calendly.com/signup" },
  { id: "square", name: "Square Appointments", connectUrl: "https://squareup.com/us/en/appointments" },
  { id: "acuity", name: "Acuity Scheduling", connectUrl: "https://acuityscheduling.com/signup.php" },
  { id: "google", name: "Google Calendar", connectUrl: "https://calendar.google.com/" },
  { id: "other", name: "Other booking page", connectUrl: "" },
] as const;

export type ProfileSkin = typeof profileSkins[number]["id"];
export type SocialIconStyle = "brand" | "skin";
export type LocationVisibility = "hidden" | "city_state" | "city_state_postal";
export type ProfileLinkKind = "link" | "social" | "video" | "support" | "booking";

export function profileSkinFromValue(value: unknown): ProfileSkin | null {
  const candidate = String(value ?? "");
  return profileSkins.some((skin) => skin.id === candidate) ? candidate as ProfileSkin : null;
}

export function profileSkinFromReturnPath(value: string): ProfileSkin | null {
  try {
    const url = new URL(value, "https://taplex.local");
    return url.origin === "https://taplex.local" ? profileSkinFromValue(url.searchParams.get("skin")) : null;
  } catch {
    return null;
  }
}

export type TapLexLink = {
  id: string;
  kind: ProfileLinkKind;
  platform: string;
  title: string;
  url: string;
  description: string;
  priceLabel: string;
  durationMinutes: number | null;
  active: boolean;
  sortOrder: number;
};

export type TapLexGalleryItem = { id: string; imageKey: string; caption: string; altText: string; sortOrder: number };

export type TapLexProfile = {
  id: string;
  handle: string;
  displayName: string;
  headline: string;
  bio: string;
  skin: ProfileSkin;
  socialIconStyle: SocialIconStyle;
  avatarKey: string | null;
  contactEmail: string;
  contactPhone: string;
  locationCity: string;
  locationRegion: string;
  locationCountry: string;
  locationPostalCode: string;
  locationLatitude: number | null;
  locationLongitude: number | null;
  locationVisibility: LocationVisibility;
  nearbyDiscovery: boolean;
  published: boolean;
  plan: "free" | "pro";
  proUnlockedAt: string | null;
  proExpiresAt: string | null;
  isPro: boolean;
  links: TapLexLink[];
  gallery: TapLexGalleryItem[];
};

export type TapLexBookingStatus = "pending" | "confirmed" | "declined" | "completed";

export type TapLexBooking = {
  id: string;
  serviceTitle: string;
  requestedDate: string;
  requestedTime: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
  status: TapLexBookingStatus;
  createdAt: string;
};

export function socialMark(platform: string) {
  return socialPlatforms.find((item) => item.id === platform)?.mark ?? "↗";
}

export function socialInputHint(platform: string) {
  const entry = socialPlatforms.find((item) => item.id === platform)?.entry;
  if (entry === "handle") return "Type only your @username, or paste the full profile URL.";
  if (entry === "phone") return "Enter the WhatsApp phone number, including country code.";
  return "Paste the complete profile URL for this platform.";
}

export function resolveSocialProfileUrl(platform: string, rawValue: string) {
  const value = rawValue.trim();
  if (!value) throw new Error("Add your social username or profile URL.");
  if (/^https?:\/\//i.test(value)) return value;
  if (/^(?:www\.)?[a-z0-9-]+(?:\.[a-z]{2,})(?:\/|$)/i.test(value)) return `https://${value}`;

  if (platform === "whatsapp") {
    const digits = value.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) throw new Error("Add a WhatsApp number with its country code.");
    return `https://wa.me/${digits}`;
  }

  if (platform === "spotify" || platform === "apple-music" || platform === "website") {
    const name = socialPlatforms.find((item) => item.id === platform)?.name ?? "social";
    throw new Error(`Paste the complete ${name} URL.`);
  }

  const handle = value.replace(/^@+/, "").replace(/^\/+|\/+$/g, "");
  if (!/^[a-z0-9._-]{1,100}$/i.test(handle)) throw new Error("Use a valid @username or paste the full profile URL.");

  const profileBases: Record<string, string> = {
    instagram: "https://www.instagram.com/",
    tiktok: "https://www.tiktok.com/@",
    facebook: "https://www.facebook.com/",
    youtube: "https://www.youtube.com/@",
    x: "https://x.com/",
    linkedin: "https://www.linkedin.com/in/",
    soundcloud: "https://soundcloud.com/",
    twitch: "https://www.twitch.tv/",
    snapchat: "https://www.snapchat.com/add/",
    threads: "https://www.threads.net/@",
    audiomack: "https://audiomack.com/",
  };
  if (platform === "bandcamp") return `https://${handle}.bandcamp.com/`;
  const base = profileBases[platform];
  if (!base) throw new Error("Choose a supported social platform.");
  return `${base}${handle}`;
}

export function resolveSupportDestination(platform: string, rawValue: string) {
  const value = rawValue.trim();
  if (!value) throw new Error("Add the username, email, or phone people should pay.");

  if (platform === "cashapp") {
    const handle = value.replace(/^[@$]+/, "");
    if (!/^[a-z0-9_]{1,20}$/i.test(handle)) throw new Error("Add a valid Cash App $cashtag.");
    return { recipient: `$${handle}`, url: `https://cash.app/$${handle}` };
  }
  if (platform === "venmo") {
    const handle = value.replace(/^@+/, "");
    if (!/^[a-z0-9_-]{1,30}$/i.test(handle)) throw new Error("Add a valid Venmo @username.");
    return { recipient: `@${handle}`, url: `https://venmo.com/u/${handle}` };
  }
  if (platform === "zelle") {
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const phone = /^[0-9+().\-\s]{7,32}$/.test(value);
    if (!email && !phone) throw new Error("Add the email or phone number connected to Zelle.");
    return { recipient: value, url: "https://www.zellepay.com/" };
  }
  if (platform === "paypal") {
    if (/^https?:\/\//i.test(value)) {
      const url = checkedSupportUrl(value, ["paypal.me", "paypal.com"]);
      return { recipient: "PayPal.Me", url };
    }
    const handle = value.replace(/^[@$]+/, "");
    if (!/^[a-z0-9._-]{1,50}$/i.test(handle)) throw new Error("Add a valid PayPal.Me username or link.");
    return { recipient: `@${handle}`, url: `https://paypal.me/${handle}` };
  }
  if (platform === "stripe") {
    return { recipient: "Secure payment link", url: checkedSupportUrl(value, ["stripe.com"]) };
  }
  if (platform === "square-pay") {
    return { recipient: "Secure payment link", url: checkedSupportUrl(value, ["square.link", "squareup.com", "square.site"]) };
  }
  if (platform === "apple-pay") {
    return { recipient: "Apple Pay-enabled checkout", url: checkedSupportUrl(value, ["stripe.com", "square.link", "squareup.com", "square.site"]) };
  }
  if (platform === "google-pay") {
    return { recipient: "Google Pay-enabled checkout", url: checkedSupportUrl(value, ["stripe.com", "square.link", "squareup.com", "square.site"]) };
  }
  throw new Error("Choose a supported payment app.");
}

function checkedSupportUrl(rawValue: string, allowedHosts?: string[]) {
  let url: URL;
  try {
    url = new URL(rawValue);
  } catch {
    throw new Error("Paste the complete secure payment link, starting with https://.");
  }
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Use a secure https:// payment link.");
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if (allowedHosts && !allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
    throw new Error("Paste a payment link from the selected provider.");
  }
  return url.toString().slice(0, 2048);
}

export function supportQrValue(platform: string, recipient: string, url: string) {
  return platform === "zelle" ? `Zelle recipient: ${recipient}` : url;
}

export function profileLocationLabel(profile: Pick<TapLexProfile, "locationCity" | "locationRegion" | "locationCountry" | "locationPostalCode" | "locationVisibility" | "isPro">) {
  if (profile.locationVisibility === "hidden") return "";
  const area = [profile.locationCity, profile.locationRegion].filter(Boolean).join(", ");
  const base = area || profile.locationCountry;
  if (profile.locationVisibility === "city_state_postal" && profile.isPro && profile.locationPostalCode) {
    return [base, profile.locationPostalCode].filter(Boolean).join(" ");
  }
  return base;
}

export function bookingProviderName(platform: string) {
  return bookingProviders.find((provider) => provider.id === platform)?.name ?? "Booking provider";
}

export function videoEmbedUrl(platform: string, rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (platform === "youtube") {
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let id = host === "youtu.be" ? url.pathname.split("/").filter(Boolean)[0] : url.searchParams.get("v");
    if (!id && (host === "youtube.com" || host.endsWith(".youtube.com"))) {
      const parts = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(parts[0] ?? "")) id = parts[1];
    }
    if (!id || !/^[a-z0-9_-]{6,32}$/i.test(id)) return null;
    return `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0`;
  }

  if (platform === "vimeo") {
    const parts = url.pathname.split("/").filter(Boolean);
    const id = [...parts].reverse().find((part) => /^\d{6,15}$/.test(part));
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }

  if (platform === "tiktok") {
    const match = url.pathname.match(/\/(?:video|player\/v1)\/(\d{10,25})(?:\/|$)/);
    return match?.[1] ? `https://www.tiktok.com/player/v1/${match[1]}?controls=1&description=1` : null;
  }

  return null;
}

export function profileImageUrl(key: string): string;
export function profileImageUrl(key: null): null;
export function profileImageUrl(key: string | null): string | null;
export function profileImageUrl(key: string | null) {
  return key ? `/api/media/${encodeURIComponent(key)}` : null;
}
