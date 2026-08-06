"use client";

import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import ShareButton from "@/components/share-button";
import MyNfcProducts from "@/components/customer/my-nfc-products";
import ProfileSettings from "@/components/customer/profile-settings";
import SocialGlyph from "@/components/customer/social-glyph";
import { optimizeImageUpload } from "@/lib/client-image";
import { readApiResponse } from "@/lib/client-response";
import {
  bookingProviderName,
  bookingProviders,
  profileImageUrl,
  profileLocationLabel,
  profileSkins,
  resolveSocialProfileUrl,
  resolveSupportDestination,
  socialInputHint,
  socialMark,
  socialPlatforms,
  supportPlatforms,
  videoPlatforms,
  type ProfileSkin,
  type TapLexBooking,
  type TapLexBookingStatus,
  type TapLexLink,
  type TapLexProfile,
} from "@/lib/profile-model";

type EditorTab = "content" | "design" | "settings";
type SaveState = "saved" | "unsaved" | "saving" | "error";
type RedeemState = "idle" | "redeeming" | "error" | "success";
type ProCheckoutState = "idle" | "loading" | "error";
type ProfileStarterKey = keyof typeof profileStarters;

const profileStarters = {
  creator: {
    label: "Creator",
    headline: "Creator · Storyteller · Brand Builder",
    bio: "Tap in for my latest work, videos, bookings, and updates. Everything I’m building is one connection away.",
  },
  artist: {
    label: "Artist",
    headline: "Artist · Performer · Creative Entrepreneur",
    bio: "Discover my latest releases, videos, upcoming appearances, and ways to work with me.",
  },
  musician: {
    label: "Musician",
    headline: "Recording Artist · Songwriter · Performer",
    bio: "Listen to my latest music, watch new videos, book an appearance, and stay connected.",
  },
  barber: {
    label: "Barber",
    headline: "Barber · Grooming · Personal Style",
    bio: "View my work, explore services, request an appointment, and save my contact for your next cut.",
  },
  stylist: {
    label: "Stylist",
    headline: "Stylist · Beauty · Personal Care",
    bio: "Explore my work, services, availability, and the easiest way to book your next appointment.",
  },
  business: {
    label: "Business owner",
    headline: "Founder · Services · Community",
    bio: "Learn what we offer, view our work, request service, and connect with the business in one tap.",
  },
  multi: {
    label: "Multi-hyphenate",
    headline: "Artist · Creator · Entrepreneur",
    bio: "One page for every side of what I do. Explore my work, services, content, and ways to connect.",
  },
} as const;

const locationCountries = [
  "United States",
  "Canada",
  "Mexico",
  "United Kingdom",
  "Jamaica",
  "Bahamas",
  "Barbados",
  "Trinidad and Tobago",
  "Nigeria",
  "Ghana",
] as const;

const locationRegions: Record<string, readonly { value: string; label: string }[]> = {
  "United States": [
    ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
    ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"],
    ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
    ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
    ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
    ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
    ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
    ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"],
    ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
    ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"],
    ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
  ].map(([value, label]) => ({ value, label })),
  Canada: [
    ["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"], ["NB", "New Brunswick"],
    ["NL", "Newfoundland and Labrador"], ["NS", "Nova Scotia"], ["NT", "Northwest Territories"],
    ["NU", "Nunavut"], ["ON", "Ontario"], ["PE", "Prince Edward Island"], ["QC", "Quebec"],
    ["SK", "Saskatchewan"], ["YT", "Yukon"],
  ].map(([value, label]) => ({ value, label })),
};

export default function ProfileEditor({ initialProfile, initialBookings, accountName, authSource, selectedSkin = null }: { initialProfile: TapLexProfile; initialBookings: TapLexBooking[]; accountName: string; authSource: "email" | "google" | "apple" | "magic" | "chatgpt"; selectedSkin?: ProfileSkin | null }) {
  const selectedSkinDetails = selectedSkin ? profileSkins.find((skin) => skin.id === selectedSkin) : null;
  const skinNeedsSaving = Boolean(selectedSkin && initialProfile.skin !== selectedSkin);
  const [profile, setProfile] = useState(() => selectedSkin ? { ...initialProfile, skin: selectedSkin } : initialProfile);
  const [tab, setTab] = useState<EditorTab>(selectedSkin ? "design" : "content");
  const [saveState, setSaveState] = useState<SaveState>(skinNeedsSaving ? "unsaved" : "saved");
  const [message, setMessage] = useState(selectedSkinDetails ? `${selectedSkinDetails.name} selected from the TapLex gallery. Review it, then save or open My Profile.` : "");
  const [socialError, setSocialError] = useState("");
  const [linkError, setLinkError] = useState("");
  const [addingSocial, setAddingSocial] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  const [addingVideo, setAddingVideo] = useState(false);
  const [addingSupport, setAddingSupport] = useState(false);
  const [addingBooking, setAddingBooking] = useState(false);
  const [socialDraft, setSocialDraft] = useState({ platform: "instagram", value: "" });
  const [linkDraft, setLinkDraft] = useState({ title: "", url: "" });
  const [videoDraft, setVideoDraft] = useState({ platform: "youtube", title: "", url: "" });
  const [supportDraft, setSupportDraft] = useState({ platform: "cashapp", recipient: "" });
  const [bookingDraft, setBookingDraft] = useState({ platform: "taplex", title: "", description: "", priceLabel: "", durationMinutes: "", url: "" });
  const [appointments, setAppointments] = useState(initialBookings);
  const [bookingInboxState, setBookingInboxState] = useState<"idle" | "loading" | "error">("idle");
  const [bookingInboxMessage, setBookingInboxMessage] = useState("");
  const [moduleError, setModuleError] = useState("");
  const [locationEntryMode, setLocationEntryMode] = useState<"city" | "postal" | "precise">("city");
  const [locationMessage, setLocationMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [profileStarter, setProfileStarter] = useState<ProfileStarterKey | "">("");
  const [starterMessage, setStarterMessage] = useState("");
  const [customCountry, setCustomCountry] = useState(() => Boolean(initialProfile.locationCountry && !locationCountries.includes(initialProfile.locationCountry as typeof locationCountries[number])));
  const [promoCode, setPromoCode] = useState("");
  const [redeemState, setRedeemState] = useState<RedeemState>("idle");
  const [redeemMessage, setRedeemMessage] = useState("");
  const [proCheckoutState, setProCheckoutState] = useState<ProCheckoutState>("idle");
  const [proCheckoutMessage, setProCheckoutMessage] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const socials = useMemo(() => profile.links.filter((link) => link.kind === "social"), [profile.links]);
  const mainLinks = useMemo(() => profile.links.filter((link) => link.kind === "link"), [profile.links]);
  const videos = useMemo(() => profile.links.filter((link) => link.kind === "video"), [profile.links]);
  const supportLinks = useMemo(() => profile.links.filter((link) => link.kind === "support"), [profile.links]);
  const bookings = useMemo(() => profile.links.filter((link) => link.kind === "booking"), [profile.links]);
  const bookingAccess = profile.isPro || bookings.length > 0;
  const socialAccess = profile.isPro || socials.length < 4;
  const mainLinkAccess = profile.isPro || mainLinks.length < 1;
  const availableRegions = locationRegions[profile.locationCountry] ?? [];

  function updateProfile<Key extends keyof TapLexProfile>(key: Key, value: TapLexProfile[Key]) {
    setProfile((current) => ({ ...current, [key]: value }));
    setSaveState("unsaved");
    setMessage("");
  }

  function replaceLink(id: string, patch: Partial<TapLexLink>) {
    updateProfile("links", profile.links.map((link) => link.id === id ? { ...link, ...patch } : link));
  }

  function applyProfileStarter() {
    if (!profileStarter) {
      setStarterMessage("Choose a profile type first.");
      return;
    }
    const starter = profileStarters[profileStarter];
    const headline = profile.headline.trim() ? profile.headline : starter.headline;
    const bio = profile.bio.trim() ? profile.bio : starter.bio;
    if (headline === profile.headline && bio === profile.bio) {
      setStarterMessage("Your headline and bio are already filled, so nothing was replaced.");
      return;
    }
    setProfile((current) => ({ ...current, headline, bio }));
    setSaveState("unsaved");
    setMessage("");
    setStarterMessage("Filled the available blank fields. Review them, then save or open My Profile.");
  }

  function changeCountry(value: string) {
    if (value === "__custom__") {
      setCustomCountry(true);
      setProfile((current) => ({ ...current, locationCountry: "", locationRegion: "" }));
    } else {
      setCustomCountry(false);
      setProfile((current) => ({
        ...current,
        locationCountry: value,
        locationRegion: current.locationCountry === value ? current.locationRegion : "",
      }));
    }
    setSaveState("unsaved");
    setMessage("");
    setLocationMessage("");
  }

  function removeLink(id: string) {
    updateProfile("links", profile.links.filter((link) => link.id !== id));
  }

  function addSocial(event: FormEvent) {
    event.preventDefault();
    if (!socialAccess) {
      setSocialError("Free profiles include 4 social icons. Redeem a founder code or upgrade to Pro for unlimited socials.");
      return;
    }
    const platform = socialPlatforms.find((item) => item.id === socialDraft.platform);
    if (!platform || !socialDraft.value.trim()) return;
    try {
      const url = resolveSocialProfileUrl(platform.id, socialDraft.value);
      updateProfile("links", [...profile.links, {
        id: newClientId(),
        kind: "social",
        platform: platform.id,
        title: platform.name,
        url,
        description: "",
        priceLabel: "",
        durationMinutes: null,
        active: true,
        sortOrder: socials.length,
      }]);
      setSocialDraft({ platform: "instagram", value: "" });
      setSocialError("");
      setAddingSocial(false);
    } catch (error) {
      setSocialError(error instanceof Error ? error.message : "Add a valid social profile.");
    }
  }

  function addMainLink(event: FormEvent) {
    event.preventDefault();
    if (!mainLinkAccess) {
      setLinkError("Free profiles include 1 main link. Redeem a founder code or upgrade to Pro for unlimited links.");
      return;
    }
    if (!linkDraft.title.trim() || !linkDraft.url.trim()) return;
    updateProfile("links", [...profile.links, {
      id: newClientId(),
      kind: "link",
      platform: "website",
      title: linkDraft.title.trim(),
      url: linkDraft.url.trim(),
      description: "",
      priceLabel: "",
      durationMinutes: null,
      active: true,
      sortOrder: mainLinks.length,
    }]);
    setLinkDraft({ title: "", url: "" });
    setLinkError("");
    setAddingLink(false);
  }

  function addVideo(event: FormEvent) {
    event.preventDefault();
    if (!videoDraft.title.trim() || !videoDraft.url.trim()) return;
    updateProfile("links", [...profile.links, {
      id: newClientId(), kind: "video", platform: videoDraft.platform, title: videoDraft.title.trim(), url: videoDraft.url.trim(),
      description: "", priceLabel: "", durationMinutes: null, active: true, sortOrder: videos.length,
    }]);
    setVideoDraft({ platform: "youtube", title: "", url: "" });
    setAddingVideo(false);
    setModuleError("");
  }

  function addSupport(event: FormEvent) {
    event.preventDefault();
    const platform = supportPlatforms.find((item) => item.id === supportDraft.platform);
    if (!platform) return;
    try {
      const destination = resolveSupportDestination(platform.id, supportDraft.recipient);
      updateProfile("links", [...profile.links, {
        id: newClientId(), kind: "support", platform: platform.id, title: platform.name, url: destination.url,
        description: destination.recipient, priceLabel: "", durationMinutes: null, active: true, sortOrder: supportLinks.length,
      }]);
      setSupportDraft({ platform: "cashapp", recipient: "" });
      setAddingSupport(false);
      setModuleError("");
    } catch (error) {
      setModuleError(error instanceof Error ? error.message : "Add valid payment details.");
    }
  }

  function usePreciseLocation() {
    if (!profile.isPro) {
      setLocationMessage("Precise device location is a TapLex Pro feature. City and state remain free.");
      return;
    }
    if (!navigator.geolocation) {
      setLocationMessage("Location services are not available in this browser. Try city/state or ZIP instead.");
      return;
    }
    setLocating(true);
    setLocationMessage("Waiting for your device permission…");
    navigator.geolocation.getCurrentPosition((position) => {
      setProfile((current) => ({
        ...current,
        locationLatitude: Number(position.coords.latitude.toFixed(5)),
        locationLongitude: Number(position.coords.longitude.toFixed(5)),
        nearbyDiscovery: true,
      }));
      setSaveState("unsaved");
      setMessage("");
      setLocating(false);
      setLocationMessage("Precise location saved for future Nearby matching. Your coordinates will never appear on your public page.");
    }, () => {
      setLocating(false);
      setLocationMessage("TapLex could not access your location. Allow location permission or choose another entry method.");
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 });
  }

  function clearPreciseLocation() {
    setProfile((current) => ({ ...current, locationLatitude: null, locationLongitude: null }));
    setSaveState("unsaved");
    setMessage("");
    setLocationMessage("Precise location removed.");
  }

  function clearPostalLocation() {
    setProfile((current) => ({ ...current, locationPostalCode: "", locationVisibility: current.locationVisibility === "city_state_postal" ? "city_state" : current.locationVisibility }));
    setSaveState("unsaved");
    setMessage("");
    setLocationMessage("Saved ZIP or postal code removed.");
  }

  function addBooking(event: FormEvent) {
    event.preventDefault();
    if (!bookingAccess) {
      setModuleError("Redeem a TapLex founder code to unlock Pro booking services.");
      return;
    }
    const isNative = bookingDraft.platform === "taplex";
    if (!bookingDraft.title.trim() || (!isNative && !bookingDraft.url.trim())) return;
    const duration = Number.parseInt(bookingDraft.durationMinutes, 10);
    updateProfile("links", [...profile.links, {
      id: newClientId(), kind: "booking", platform: bookingDraft.platform, title: bookingDraft.title.trim(), url: isNative ? "https://taplex.co/booking" : bookingDraft.url.trim(),
      description: bookingDraft.description.trim(), priceLabel: bookingDraft.priceLabel.trim(),
      durationMinutes: Number.isFinite(duration) && duration > 0 ? duration : null, active: true, sortOrder: bookings.length,
    }]);
    setBookingDraft({ platform: "taplex", title: "", description: "", priceLabel: "", durationMinutes: "", url: "" });
    setAddingBooking(false);
    setModuleError("");
  }

  async function redeemCode(event: FormEvent) {
    event.preventDefault();
    if (!promoCode.trim()) return;
    setRedeemState("redeeming");
    setRedeemMessage("");
    try {
      const response = await fetch("/api/profile/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode }),
      });
      const data = await readApiResponse<{ profile?: TapLexProfile; message?: string }>(response);
      if (!response.ok || !data.profile) throw new Error(data.error ?? "That code could not be redeemed.");
      setProfile(data.profile);
      setPromoCode("");
      setRedeemState("success");
      setRedeemMessage(data.message ?? "TapLex Pro unlocked.");
    } catch (error) {
      setRedeemState("error");
      setRedeemMessage(error instanceof Error ? error.message : "That code could not be redeemed.");
    }
  }

  async function startProCheckout(plan: "monthly" | "yearly") {
    setProCheckoutState("loading");
    setProCheckoutMessage(plan === "yearly" ? "Starting yearly Pro checkout…" : "Starting monthly Pro checkout…");
    try {
      const response = await fetch("/api/pro/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await readApiResponse<{ url?: string }>(response);
      if (!response.ok || !data.url) throw new Error(data.error ?? "TapLex Pro checkout could not be started.");
      window.location.href = data.url;
    } catch (error) {
      setProCheckoutState("error");
      setProCheckoutMessage(error instanceof Error ? error.message : "TapLex Pro checkout could not be started.");
    }
  }

  async function refreshBookings() {
    setBookingInboxState("loading");
    setBookingInboxMessage("");
    try {
      const response = await fetch("/api/profile/bookings", { cache: "no-store" });
      const data = await readApiResponse<{ bookings?: TapLexBooking[] }>(response);
      if (!response.ok || !data.bookings) throw new Error(data.error ?? "Bookings could not be refreshed.");
      setAppointments(data.bookings);
      setBookingInboxState("idle");
    } catch (error) {
      setBookingInboxState("error");
      setBookingInboxMessage(error instanceof Error ? error.message : "Bookings could not be refreshed.");
    }
  }

  async function updateBookingStatus(bookingId: string, status: TapLexBookingStatus) {
    setBookingInboxState("loading");
    setBookingInboxMessage("");
    try {
      const response = await fetch("/api/profile/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, status }),
      });
      const data = await readApiResponse<{ bookings?: TapLexBooking[] }>(response);
      if (!response.ok || !data.bookings) throw new Error(data.error ?? "Booking could not be updated.");
      setAppointments(data.bookings);
      setBookingInboxState("idle");
    } catch (error) {
      setBookingInboxState("error");
      setBookingInboxMessage(error instanceof Error ? error.message : "Booking could not be updated.");
    }
  }

  function moveLink(id: string, direction: -1 | 1) {
    const current = profile.links.find((link) => link.id === id);
    if (!current) return;
    const sameKind = profile.links.filter((link) => link.kind === current.kind);
    const index = sameKind.findIndex((link) => link.id === id);
    const target = sameKind[index + direction];
    if (!target) return;
    const next = [...profile.links];
    const sourceIndex = next.findIndex((link) => link.id === id);
    const targetIndex = next.findIndex((link) => link.id === target.id);
    [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
    updateProfile("links", next);
  }

  function dropOn(targetId: string) {
    if (!draggedId || draggedId === targetId) return setDraggedId(null);
    const source = profile.links.find((link) => link.id === draggedId);
    const target = profile.links.find((link) => link.id === targetId);
    if (!source || !target || source.kind !== target.kind) return setDraggedId(null);
    const next = [...profile.links];
    const sourceIndex = next.findIndex((link) => link.id === draggedId);
    const targetIndex = next.findIndex((link) => link.id === targetId);
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    updateProfile("links", next);
    setDraggedId(null);
  }

  async function persist(nextPublished = profile.published, openProfile = false) {
    setSaveState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, published: nextPublished }),
      });
      const data = await readApiResponse<{ profile?: TapLexProfile }>(response);
      if (!response.ok || !data.profile) throw new Error(data.error ?? "Your profile could not be saved.");
      setProfile(data.profile);
      setSaveState("saved");
      setMessage(openProfile ? "Opening your profile…" : nextPublished ? "Your TapLex is live." : "Changes saved.");
      if (openProfile) window.location.assign(`/p/${data.profile.handle}`);
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "Your profile could not be saved.");
    }
  }

  async function uploadAvatar(file: File) {
    setSaveState("saving");
    setMessage(file.size > 850 * 1024 ? "Optimizing your photo…" : "Uploading your photo…");
    try {
      const optimizedImage = await optimizeImageUpload(file);
      const form = new FormData();
      form.set("image", optimizedImage, optimizedImage.name);
      const response = await fetch("/api/profile/avatar", { method: "POST", body: form });
      const data = await readApiResponse<{ avatarKey?: string | null }>(response);
      if (!response.ok || !data.avatarKey) throw new Error(data.error ?? "Image upload failed.");
      setProfile((current) => ({ ...current, avatarKey: data.avatarKey ?? null }));
      setSaveState("saved");
      setMessage("Profile image updated successfully.");
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeAvatar() {
    setSaveState("saving");
    const response = await fetch("/api/profile/avatar", { method: "DELETE" });
    const data = await readApiResponse<Record<string, never>>(response);
    if (!response.ok) {
      setSaveState("error");
      setMessage(data.error ?? "Image could not be removed.");
      return;
    }
    setProfile((current) => ({ ...current, avatarKey: null }));
    setSaveState("saved");
    setMessage("Profile image removed.");
  }

  async function uploadGallery(file: File) {
    setSaveState("saving"); setMessage("Uploading work photo…");
    try { const optimized = await optimizeImageUpload(file); const form = new FormData(); form.set("image", optimized, optimized.name); form.set("altText", file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ")); const response = await fetch("/api/profile/gallery", { method: "POST", body: form }); const data = await readApiResponse<{ item?: TapLexProfile["gallery"][number] }>(response); if (!response.ok || !data.item) throw new Error(data.error ?? "Work photo could not be uploaded."); setProfile((current) => ({ ...current, gallery: [...current.gallery, data.item!] })); setSaveState("saved"); setMessage("Work photo added to your gallery."); }
    catch (error) { setSaveState("error"); setMessage(error instanceof Error ? error.message : "Work photo could not be uploaded."); }
    finally { if (galleryInputRef.current) galleryInputRef.current.value = ""; }
  }

  async function removeGallery(id: string) { setSaveState("saving"); const response = await fetch(`/api/profile/gallery?id=${encodeURIComponent(id)}`, { method: "DELETE" }); const data = await readApiResponse<Record<string, never>>(response); if (!response.ok) { setSaveState("error"); setMessage(data.error ?? "Photo could not be removed."); return; } setProfile((current) => ({ ...current, gallery: current.gallery.filter((item) => item.id !== id) })); setSaveState("saved"); setMessage("Work photo removed."); }

  return (
    <main className="profile-app" id="editor">
      <aside className="profile-app-nav">
        <Link className="profile-app-brand" href="/"><LogoCrop /><span>TapLex</span></Link>
        <nav aria-label="Customer dashboard">
          <Link className="nav-secondary" href="/"><NavIcon name="home" />Home</Link>
          <a href={`/p/${profile.handle}`} onClick={(event) => { event.preventDefault(); void persist(true, true); }}><NavIcon name="profile" />My Profile</a>
          <a className="selected" href="#editor" aria-current="page"><NavIcon name="edit" />Edit Profile</a>
          <Link href="/connections"><NavIcon name="connections" />People I Met</Link>
          <a href="#my-nfc" onClick={(event) => { event.preventDefault(); setTab("content"); window.setTimeout(() => document.getElementById("my-nfc")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0); }}><NavIcon name="external" />My NFC</a>
          <Link className="nav-secondary" href="/order"><NavIcon name="bag" />Products</Link>
        </nav>
        <div className="profile-account">
          <Avatar profile={profile} small />
          <span><b>{accountName}</b><small>@{profile.handle}</small></span>
          {authSource === "chatgpt" ? <a href="/signout-with-chatgpt?return_to=/" aria-label="Sign out">↗</a> : <form action="/api/auth/logout" method="post"><button type="submit" aria-label="Sign out">↗</button></form>}
        </div>
      </aside>

      <section className="profile-workspace">
        <header className="profile-app-topbar">
          <div className={`save-indicator ${saveState}`}><i />{saveState === "saving" ? "Saving" : saveState === "unsaved" ? "Unsaved" : saveState === "error" ? "Needs attention" : "Saved"}</div>
          {authSource === "chatgpt" ? (
            <a className="profile-logout-button" href="/signout-with-chatgpt?return_to=/">Log out</a>
          ) : (
            <form className="profile-logout-form" action="/api/auth/logout" method="post">
              <button className="profile-logout-button" type="submit">Log out</button>
            </form>
          )}
          <button className="profile-save-button" type="button" onClick={() => void persist(profile.published)} disabled={saveState === "saving"}>Save</button>
          <button className="profile-publish-button" type="button" onClick={() => void persist(true, true)} disabled={saveState === "saving"}>{profile.published ? "My Profile →" : "Publish & View →"}</button>
        </header>

        <div className="profile-editor-column">
          <div className="profile-editor-heading">
            <p>Welcome back, {accountName.split(" ")[0]}</p>
            <h1>Build your TapLex</h1>
          </div>
          <div className="editor-tabs" role="tablist" aria-label="Profile editor sections">
            <button type="button" role="tab" aria-selected={tab === "content"} onClick={() => setTab("content")}>Content</button>
            <button type="button" role="tab" aria-selected={tab === "design"} onClick={() => setTab("design")}>Design</button>
            <button type="button" role="tab" aria-selected={tab === "settings"} onClick={() => setTab("settings")}>Settings</button>
          </div>

          {profile.isPro ? <section className="founder-pro-card active"><span>✦</span><div><small>MEMBERSHIP</small><b>TapLex Pro is active</b><p>{profile.proExpiresAt ? `All Pro profile features are unlocked through ${new Date(profile.proExpiresAt).toLocaleDateString()}.` : "All current TapLex profile features are unlocked for life."}</p></div><em>PRO</em></section> : <section className="founder-pro-card"><span>✦</span><div><small>PRO ACCESS</small><b>Unlock every TapLex feature</b><p>Go Pro for unlimited links, unlimited social icons, booking services, ZIP/device location tools, and premium profile growth features. Have a TapLex Pro code? Enter it below.</p><div className="pro-plan-actions"><button type="button" onClick={() => void startProCheckout("monthly")} disabled={proCheckoutState === "loading"}><b>$2.99</b><small>/ month</small></button><button type="button" onClick={() => void startProCheckout("yearly")} disabled={proCheckoutState === "loading"}><b>$35.88</b><small>/ year</small></button></div>{proCheckoutMessage ? <strong className={proCheckoutState === "error" ? "error" : ""}>{proCheckoutMessage}</strong> : null}<form onSubmit={redeemCode}><input aria-label="Pro access code" value={promoCode} maxLength={32} autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder="Founder or promo code" onChange={(event) => { setPromoCode(event.target.value.toUpperCase()); setRedeemState("idle"); setRedeemMessage(""); }} /><button type="submit" disabled={redeemState === "redeeming"}>{redeemState === "redeeming" ? "Unlocking…" : "Use code"}</button></form>{redeemMessage ? <strong className={redeemState}>{redeemMessage}</strong> : null}</div><em>PRO</em></section>}

          {tab === "content" ? (
            <div className="editor-stack">
              <MyNfcProducts />
              <section className="editor-panel profile-details-panel">
                <div className="editor-panel-heading"><div><h2>Profile</h2><p>Start with guided fill-ins or type everything your way.</p></div><span>MAKE IT YOURS</span></div>
                <div className="profile-starter-panel">
                  <label><span>Quick profile fill-ins</span><select value={profileStarter} onChange={(event) => { setProfileStarter(event.target.value as ProfileStarterKey | ""); setStarterMessage(""); }}><option value="">Choose your profile type</option>{Object.entries(profileStarters).map(([key, starter]) => <option key={key} value={key}>{starter.label}</option>)}</select></label>
                  <button type="button" onClick={applyProfileStarter} disabled={!profileStarter}>Fill available blanks</button>
                  <small>Starter text fills only empty headline and bio fields. It never replaces what you already wrote.</small>
                  {starterMessage ? <p role="status">{starterMessage}</p> : null}
                </div>
                <div className="profile-photo-editor">
                  <Avatar profile={profile} />
                  <div><button type="button" onClick={() => fileInputRef.current?.click()}>Upload photo</button>{profile.avatarKey ? <button type="button" className="quiet" onClick={() => void removeAvatar()}>Remove</button> : null}<small>JPG, PNG, or WebP · large phone photos are optimized automatically</small></div>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); }} />
                </div>
                <div className="editor-fields editor-fields-two">
                  <EditorField label="Display name" value={profile.displayName} maxLength={60} onChange={(value) => updateProfile("displayName", value)} />
                  <EditorField label="TapLex handle" value={profile.handle} maxLength={30} prefix="taplex.co/p/" onChange={(value) => updateProfile("handle", value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))} />
                  <EditorField label="Headline" value={profile.headline} maxLength={80} onChange={(value) => updateProfile("headline", value)} />
                  <EditorField label="Bio" value={profile.bio} maxLength={220} multiline onChange={(value) => updateProfile("bio", value)} />
                </div>
              </section>

              <section className="editor-panel gallery-editor-panel">
                <div className="editor-panel-heading"><div><h2>Work gallery</h2><p>Upload photos of your art, cuts, products, projects, events, or other work.</p></div><button type="button" disabled={profile.gallery.length >= 12 || saveState === "saving"} onClick={() => galleryInputRef.current?.click()}>{profile.gallery.length >= 12 ? "12/12" : "+ Add photos"}</button></div>
                <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(event) => { const files = Array.from(event.target.files ?? []).slice(0, Math.max(0, 12 - profile.gallery.length)); void (async () => { for (const file of files) await uploadGallery(file); })(); }} />
                {profile.gallery.length ? <div className="gallery-editor-grid">{profile.gallery.map((item, index) => <article key={item.id}><img src={profileImageUrl(item.imageKey)} alt={item.altText || item.caption || `Work sample ${index + 1}`} /><span><b>{item.caption || `Work sample ${index + 1}`}</b><small>{item.altText}</small></span><button type="button" onClick={() => void removeGallery(item.id)} aria-label={`Remove work photo ${index + 1}`}>Remove</button></article>)}</div> : <p className="editor-empty">No work photos yet. Add your best work when you’re ready.</p>}
                <small className="gallery-help">JPG, PNG, or WebP · up to 12 photos · large phone images are optimized before upload.</small>
              </section>

              <section className="editor-panel location-editor-panel">
                <div className="editor-panel-heading"><div><h2>Location</h2><p>Help people know your area now and prepare for future Nearby networking.</p></div><span>PRIVACY FIRST</span></div>
                <div className="location-method-picker" role="group" aria-label="Choose how to enter location">
                  <button type="button" className={locationEntryMode === "city" ? "selected" : ""} onClick={() => { setLocationEntryMode("city"); setLocationMessage(""); }}><b>City & state</b><small>Free · enter manually</small></button>
                  <button type="button" className={locationEntryMode === "postal" ? "selected" : ""} onClick={() => { setLocationEntryMode("postal"); setLocationMessage(profile.isPro ? "" : "ZIP and postal-code entry is available with TapLex Pro."); }}><b>ZIP / postal</b><small>Pro · area matching</small></button>
                  <button type="button" className={locationEntryMode === "precise" ? "selected" : ""} onClick={() => { setLocationEntryMode("precise"); setLocationMessage(profile.isPro ? "Tap Use my location when you are ready." : "Device location is available with TapLex Pro."); }}><b>Device location</b><small>Pro · precise nearby</small></button>
                </div>
                {locationEntryMode === "city" ? <div className="editor-fields location-fields">
                  <label className="editor-field location-select-field"><span>Country</span><select value={customCountry ? "__custom__" : profile.locationCountry} autoComplete="country-name" onChange={(event) => changeCountry(event.target.value)}><option value="">Choose your country</option>{locationCountries.map((country) => <option key={country} value={country}>{country}</option>)}<option value="__custom__">Other country / type it in</option></select></label>
                  {customCountry ? <EditorField label="Type your country" value={profile.locationCountry} maxLength={80} autoComplete="country-name" placeholder="Country name" onChange={(value) => updateProfile("locationCountry", value)} /> : null}
                  {availableRegions.length ? <label className="editor-field location-select-field"><span>State / province</span><select value={profile.locationRegion} autoComplete="address-level1" onChange={(event) => updateProfile("locationRegion", event.target.value)}><option value="">Choose state / province</option>{profile.locationRegion && !availableRegions.some((region) => region.value === profile.locationRegion) ? <option value={profile.locationRegion}>{profile.locationRegion} (saved)</option> : null}{availableRegions.map((region) => <option key={region.value} value={region.value}>{region.label} ({region.value})</option>)}</select></label> : <EditorField label="State / region" value={profile.locationRegion} maxLength={80} autoComplete="address-level1" placeholder="State, province, or region" onChange={(value) => updateProfile("locationRegion", value)} />}
                  <EditorField label="City" value={profile.locationCity} maxLength={80} autoComplete="address-level2" placeholder="City" onChange={(value) => updateProfile("locationCity", value)} />
                </div> : null}
                {locationEntryMode === "postal" ? <div className="location-pro-entry">
                  <label><span>ZIP / postal code <em className="pro-badge">PRO</em></span><input value={profile.locationPostalCode} maxLength={16} autoComplete="postal-code" disabled={!profile.isPro} placeholder="90015" onChange={(event) => updateProfile("locationPostalCode", event.target.value.toUpperCase())} /></label>
                  <small>Used for closer area matching. It appears publicly only if you choose that visibility below.</small>
                  {!profile.isPro && profile.locationPostalCode ? <button type="button" className="location-clear-inline" onClick={clearPostalLocation}>Remove saved ZIP</button> : null}
                </div> : null}
                {locationEntryMode === "precise" ? <div className="location-pro-entry precise">
                  <div><span className="location-pin">⌖</span><span><b>{profile.locationLatitude !== null && profile.locationLongitude !== null ? "Device location added" : "Use this device’s location"}</b><small>Saved for future Nearby matching—never shown as coordinates on your public profile.</small></span></div>
                  <div className="location-actions"><button type="button" onClick={usePreciseLocation} disabled={locating || !profile.isPro}>{locating ? "Finding you…" : profile.locationLatitude !== null ? "Update location" : "Use my location"}</button>{profile.locationLatitude !== null && profile.locationLongitude !== null ? <><a href={`https://www.google.com/maps?q=${profile.locationLatitude},${profile.locationLongitude}`} target="_blank" rel="noreferrer">Check map ↗</a><button type="button" className="quiet" onClick={clearPreciseLocation}>Remove</button></> : null}</div>
                </div> : null}
                {locationMessage ? <p className="location-message" role="status">{locationMessage}</p> : null}
                <div className="location-privacy-row">
                  <label><span>What visitors see</span><select value={profile.locationVisibility} onChange={(event) => updateProfile("locationVisibility", event.target.value as TapLexProfile["locationVisibility"])}><option value="hidden">Hide my location</option><option value="city_state">City & state only</option><option value="city_state_postal" disabled={!profile.isPro}>City, state & ZIP · Pro</option></select></label>
                  <label className="nearby-toggle"><input type="checkbox" checked={profile.nearbyDiscovery} onChange={(event) => updateProfile("nearbyDiscovery", event.target.checked)} /><span><b>Future Nearby discovery</b><small>Allow TapLex to use the area you saved to help you find creators, friends, and community when Nearby launches.</small></span></label>
                </div>
                <p className="location-safety-note">TapLex never shows precise coordinates publicly. Public pages display only the location level you select.</p>
              </section>

              <section className="editor-panel">
                <div className="editor-panel-heading"><div><h2>Social icons</h2><p>{profile.isPro ? `${socials.length} added · unlimited with Pro` : `${socials.length}/4 included on Free`}</p></div><button type="button" disabled={!socialAccess} title={!socialAccess ? "Unlock Pro to add unlimited social icons" : undefined} onClick={() => { if (socialAccess) setAddingSocial((open) => !open); }}>{socialAccess ? "+ Add social" : "4/4 · Pro"}</button></div>
                <p className="editor-panel-copy">Type only your @username on supported platforms—we build the profile link for you. Bandcamp and Audiomack are included for artists.</p>
                <div className="social-editor-list">
                  {socials.map((link) => <SocialEditorItem key={link.id} link={link} onToggle={() => replaceLink(link.id, { active: !link.active })} onRemove={() => removeLink(link.id)} />)}
                  {socials.length === 0 ? <p className="editor-empty">Add the social accounts you want people to reach first.</p> : null}
                </div>
                {!socialAccess ? <p className="pro-lock-message">You reached the four-icon Free limit. Your existing icons stay live; Pro unlocks unlimited socials.</p> : null}
                {addingSocial ? <form className="inline-add-form social-add-form" onSubmit={addSocial}><select aria-label="Social platform" value={socialDraft.platform} onChange={(event) => { setSocialDraft({ platform: event.target.value, value: "" }); setSocialError(""); }}>{socialPlatforms.map((platform) => <option key={platform.id} value={platform.id}>{platform.name}</option>)}</select><input aria-label="Social username or profile URL" type="text" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder={socialPlatforms.find((platform) => platform.id === socialDraft.platform)?.placeholder} required value={socialDraft.value} onChange={(event) => { setSocialDraft((draft) => ({ ...draft, value: event.target.value })); setSocialError(""); }} /><button type="submit">Add</button><button type="button" className="quiet" onClick={() => { setAddingSocial(false); setSocialError(""); }}>Cancel</button><small className={socialError ? "social-input-help error" : "social-input-help"}>{socialError || socialInputHint(socialDraft.platform)}</small></form> : null}
              </section>

              <section className="editor-panel">
                <div className="editor-panel-heading"><div><h2>Links</h2><p>{profile.isPro ? `${mainLinks.length} added · unlimited with Pro` : `${mainLinks.length}/1 included on Free`}</p></div><button type="button" disabled={!mainLinkAccess} title={!mainLinkAccess ? "Unlock Pro to add unlimited main links" : undefined} onClick={() => { if (mainLinkAccess) { setAddingLink((open) => !open); setLinkError(""); } }}>{mainLinkAccess ? "+ Add link" : "1/1 · Pro"}</button></div>
                <div className="link-editor-list">
                  {mainLinks.map((link, index) => <LinkEditorItem key={link.id} link={link} first={index === 0} last={index === mainLinks.length - 1} dragging={draggedId === link.id} onDragStart={() => setDraggedId(link.id)} onDrop={() => dropOn(link.id)} onChange={(patch) => replaceLink(link.id, patch)} onRemove={() => removeLink(link.id)} onMove={(direction) => moveLink(link.id, direction)} />)}
                  {mainLinks.length === 0 ? <p className="editor-empty">Your page is ready for its first link.</p> : null}
                </div>
                {!mainLinkAccess ? <p className="pro-lock-message">You reached the one-link Free limit. Your link stays live; Pro unlocks unlimited main links.</p> : null}
                {linkError ? <p className="social-input-help error">{linkError}</p> : null}
                {addingLink ? <form className="inline-add-form link-add-form" onSubmit={addMainLink}><input aria-label="Link title" placeholder="Link title" required maxLength={70} value={linkDraft.title} onChange={(event) => { setLinkDraft((draft) => ({ ...draft, title: event.target.value })); setLinkError(""); }} /><input aria-label="Destination URL" type="url" placeholder="https://..." required value={linkDraft.url} onChange={(event) => { setLinkDraft((draft) => ({ ...draft, url: event.target.value })); setLinkError(""); }} /><button type="submit">Add</button><button type="button" className="quiet" onClick={() => { setAddingLink(false); setLinkError(""); }}>Cancel</button></form> : null}
              </section>

              <section className="editor-panel module-panel">
                <div className="editor-panel-heading"><div><h2>Videos</h2><p>Give video its own spotlight—not another generic link.</p></div><button type="button" onClick={() => setAddingVideo((open) => !open)}>+ Add video</button></div>
                <div className="module-editor-list">
                  {videos.map((link) => <ModuleEditorItem key={link.id} link={link} mark="▶" detail={shortUrl(link.url)} onToggle={() => replaceLink(link.id, { active: !link.active })} onRemove={() => removeLink(link.id)} />)}
                  {videos.length === 0 ? <p className="editor-empty">Add a YouTube, Vimeo, or TikTok video.</p> : null}
                </div>
                {addingVideo ? <form className="module-add-form" onSubmit={addVideo}>
                  <select aria-label="Video platform" value={videoDraft.platform} onChange={(event) => setVideoDraft((draft) => ({ ...draft, platform: event.target.value }))}>{videoPlatforms.map((platform) => <option key={platform.id} value={platform.id}>{platform.name}</option>)}</select>
                  <input aria-label="Video title" placeholder="Video title" required maxLength={70} value={videoDraft.title} onChange={(event) => setVideoDraft((draft) => ({ ...draft, title: event.target.value }))} />
                  <input aria-label="Video URL" type="url" placeholder={videoPlatforms.find((platform) => platform.id === videoDraft.platform)?.placeholder} required value={videoDraft.url} onChange={(event) => setVideoDraft((draft) => ({ ...draft, url: event.target.value }))} />
                  <div><button type="submit">Add video</button><button type="button" className="quiet" onClick={() => setAddingVideo(false)}>Cancel</button></div>
                </form> : null}
              </section>

              <section className="editor-panel module-panel support-editor-panel">
                <div className="editor-panel-heading"><div><h2>Support Me</h2><p>Add a username or secure payment link. TapLex builds the button and QR code.</p></div><button type="button" onClick={() => { setAddingSupport((open) => !open); setModuleError(""); }}>+ Add payment</button></div>
                <div className="module-editor-list">
                  {supportLinks.map((link) => <ModuleEditorItem key={link.id} link={link} mark="$" detail={link.description} onToggle={() => replaceLink(link.id, { active: !link.active })} onRemove={() => removeLink(link.id)} />)}
                  {supportLinks.length === 0 ? <p className="editor-empty">Accept support through Cash App, Venmo, Zelle, PayPal, Stripe, Square, Apple Pay, or Google Pay.</p> : null}
                </div>
                {addingSupport ? <form className="module-add-form compact" onSubmit={addSupport}>
                  <select aria-label="Payment app" value={supportDraft.platform} onChange={(event) => { setSupportDraft({ platform: event.target.value, recipient: "" }); setModuleError(""); }}>{supportPlatforms.map((platform) => <option key={platform.id} value={platform.id}>{platform.name}</option>)}</select>
                  <input aria-label="Payment username, recipient, or secure checkout link" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder={supportPlatforms.find((platform) => platform.id === supportDraft.platform)?.placeholder} required value={supportDraft.recipient} onChange={(event) => { setSupportDraft((draft) => ({ ...draft, recipient: event.target.value })); setModuleError(""); }} />
                  <div><button type="submit">Add payment</button><button type="button" className="quiet" onClick={() => { setAddingSupport(false); setModuleError(""); }}>Cancel</button></div>
                  <small className={moduleError ? "social-input-help error" : "social-input-help"}>{moduleError || supportPlatforms.find((platform) => platform.id === supportDraft.platform)?.help || "Your profile will open the payment app and show a scannable QR code."}{!moduleError && supportPlatforms.find((platform) => platform.id === supportDraft.platform)?.setupUrl ? <> <a href={supportPlatforms.find((platform) => platform.id === supportDraft.platform)?.setupUrl} target="_blank" rel="noreferrer">Create payment link ↗</a></> : null}</small>
                </form> : null}
              </section>

              <section className="editor-panel module-panel booking-editor-panel">
                <div className="editor-panel-heading"><div><h2>Booking & services <em className="pro-badge">PRO</em></h2><p>Take requests directly on TapLex or connect the booking page you already use.</p></div><button type="button" disabled={!bookingAccess} title={!bookingAccess ? "Redeem a founder code to unlock TapLex Pro" : undefined} onClick={() => { if (bookingAccess) setAddingBooking((open) => !open); }}>{bookingAccess ? "+ Add service" : "Locked"}</button></div>
                <div className="booking-connect-strip"><span>Use TapLex Booking, Booksy, Calendly, Square, Acuity, Google, or any booking page.</span><b>Direct TapLex requests arrive in your inbox below.</b></div>
                {!bookingAccess ? <p className="pro-lock-message">Redeem your founder code above to list services and receive bookings.</p> : null}
                <div className="module-editor-list">
                  {bookings.map((link) => <ModuleEditorItem key={link.id} link={link} mark="□" detail={[link.priceLabel, link.durationMinutes ? `${link.durationMinutes} min` : "", bookingProviderName(link.platform)].filter(Boolean).join(" · ")} onToggle={() => replaceLink(link.id, { active: !link.active })} onRemove={() => removeLink(link.id)} />)}
                  {bookings.length === 0 ? <p className="editor-empty">List a haircut, consultation, styling session, class, or other bookable service.</p> : null}
                </div>
                {addingBooking ? <form className="module-add-form booking-add-form" onSubmit={addBooking}>
                  <label><span>Booking provider</span><select aria-label="Booking provider" value={bookingDraft.platform} onChange={(event) => setBookingDraft((draft) => ({ ...draft, platform: event.target.value }))}>{bookingProviders.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label>
                  <label><span>Service name</span><input aria-label="Service name" placeholder="Signature haircut" required maxLength={70} value={bookingDraft.title} onChange={(event) => setBookingDraft((draft) => ({ ...draft, title: event.target.value }))} /></label>
                  <label className="wide"><span>Description</span><textarea aria-label="Service description" placeholder="What is included?" maxLength={180} value={bookingDraft.description} onChange={(event) => setBookingDraft((draft) => ({ ...draft, description: event.target.value }))} /></label>
                  <label><span>Price</span><input aria-label="Service price" placeholder="$45 or From $45" maxLength={32} value={bookingDraft.priceLabel} onChange={(event) => setBookingDraft((draft) => ({ ...draft, priceLabel: event.target.value }))} /></label>
                  <label><span>Duration</span><input aria-label="Duration in minutes" type="number" min="5" max="1440" step="5" placeholder="45 minutes" value={bookingDraft.durationMinutes} onChange={(event) => setBookingDraft((draft) => ({ ...draft, durationMinutes: event.target.value }))} /></label>
                  {bookingDraft.platform === "taplex" ? <div className="native-booking-note wide"><b>Direct TapLex booking</b><span>Visitors choose a date and time on your profile. The request appears in your Booking inbox for you to confirm.</span></div> : <label className="wide"><span>Your public booking link</span><input aria-label="Public booking URL" type="url" placeholder="https://your-booking-page..." required value={bookingDraft.url} onChange={(event) => setBookingDraft((draft) => ({ ...draft, url: event.target.value }))} /></label>}
                  <div className="booking-form-actions"><button type="submit">Add service</button><button type="button" className="quiet" onClick={() => setAddingBooking(false)}>Cancel</button>{bookingProviders.find((provider) => provider.id === bookingDraft.platform)?.connectUrl ? <a href={bookingProviders.find((provider) => provider.id === bookingDraft.platform)?.connectUrl} target="_blank" rel="noreferrer">Create or connect {bookingProviderName(bookingDraft.platform)} ↗</a> : null}</div>
                </form> : null}
              </section>

              {profile.isPro || appointments.length ? <section className="editor-panel booking-inbox-panel">
                <div className="editor-panel-heading"><div><h2>Booking inbox</h2><p>Direct TapLex requests appear here for you to manage.</p></div><button type="button" onClick={() => void refreshBookings()} disabled={bookingInboxState === "loading"}>{bookingInboxState === "loading" ? "Refreshing…" : "Refresh"}</button></div>
                {bookingInboxMessage ? <p className="booking-inbox-message error" role="alert">{bookingInboxMessage}</p> : null}
                <div className="booking-inbox-list">
                  {appointments.map((booking) => <article className="booking-inbox-card" key={booking.id}>
                    <div className="booking-inbox-card-top"><span><small>{booking.serviceTitle}</small><b>{booking.customerName}</b></span><em className={`booking-status ${booking.status}`}>{booking.status}</em></div>
                    <dl><div><dt>Date</dt><dd>{formatBookingDate(booking.requestedDate)}</dd></div><div><dt>Requested time</dt><dd>{formatBookingTime(booking.requestedTime)}</dd></div></dl>
                    <div className="booking-customer-contact">{booking.customerEmail ? <a href={`mailto:${booking.customerEmail}`}>{booking.customerEmail}</a> : null}{booking.customerPhone ? <a href={`tel:${booking.customerPhone}`}>{booking.customerPhone}</a> : null}</div>
                    {booking.notes ? <p>{booking.notes}</p> : null}
                    {booking.status === "pending" ? <div className="booking-inbox-actions"><button type="button" onClick={() => void updateBookingStatus(booking.id, "confirmed")}>Confirm</button><button type="button" className="quiet" onClick={() => void updateBookingStatus(booking.id, "declined")}>Decline</button></div> : null}
                    {booking.status === "confirmed" ? <div className="booking-inbox-actions"><button type="button" onClick={() => void updateBookingStatus(booking.id, "completed")}>Mark complete</button><button type="button" className="quiet" onClick={() => void updateBookingStatus(booking.id, "declined")}>Decline</button></div> : null}
                  </article>)}
                  {appointments.length === 0 ? <p className="editor-empty">No direct booking requests yet. Add a service using TapLex Booking and publish your profile.</p> : null}
                </div>
              </section> : null}

              <section className="editor-panel">
                <h2>Contact card</h2>
                <p className="editor-panel-copy">Optional details visitors can save directly from your TapLex.</p>
                <div className="editor-fields editor-fields-two">
                  <EditorField label="Public email" type="email" value={profile.contactEmail} maxLength={120} onChange={(value) => updateProfile("contactEmail", value)} />
                  <EditorField label="Public phone" type="tel" value={profile.contactPhone} maxLength={32} onChange={(value) => updateProfile("contactPhone", value)} />
                </div>
              </section>
            </div>
          ) : tab === "design" ? (
            <section className="editor-panel design-panel">
              <div className="editor-panel-heading"><div><h2>Profile skins</h2><p>Change the mood without changing your links.</p></div><span>{profileSkins.length} styles</span></div>
              <div className="design-skin-grid">{profileSkins.map((skin) => <button key={skin.id} type="button" className={profile.skin === skin.id ? "selected" : ""} onClick={() => updateProfile("skin", skin.id)}><span className={`design-skin-swatch public-skin-${skin.id}`}><i /><i /><i /></span><b>{skin.name}</b><small>{skin.mood}</small><em>{profile.skin === skin.id ? "✓" : ""}</em></button>)}</div>
              <div className="social-icon-style-picker"><div><h3>Social icon appearance</h3><p>Use familiar platform colors for faster recognition, or match every icon to your selected skin.</p></div><div><button type="button" className={profile.socialIconStyle === "brand" ? "selected" : ""} onClick={() => updateProfile("socialIconStyle", "brand")}><span className="icon-style-preview social-icons-brand"><i data-platform="instagram"><SocialGlyph platform="instagram" /></i><i data-platform="spotify"><SocialGlyph platform="spotify" /></i><i data-platform="youtube"><SocialGlyph platform="youtube" /></i></span><b>Official colors</b><small>Best for recognition</small></button><button type="button" className={profile.socialIconStyle === "skin" ? "selected" : ""} onClick={() => updateProfile("socialIconStyle", "skin")}><span className="icon-style-preview icon-style-skin"><i><SocialGlyph platform="instagram" /></i><i><SocialGlyph platform="spotify" /></i><i><SocialGlyph platform="youtube" /></i></span><b>Match my skin</b><small>One-color luxury look</small></button></div></div>
            </section>
          ) : <ProfileSettings handle={profile.handle} onManageTags={() => { setTab("content"); window.setTimeout(() => document.getElementById("my-nfc")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0); }} />}
          {message ? <div className={`editor-message ${saveState}`} role="status">{message}</div> : null}
          {profile.published ? <div className="published-controls"><p>Your public page is live at <a href={`/p/${profile.handle}`} onClick={(event) => { if (saveState !== "saved") { event.preventDefault(); void persist(true, true); } }}>taplex.co/p/{profile.handle}</a></p><div><ShareButton className="published-share-button" url={`/p/${profile.handle}`} title={`${profile.displayName} on TapLex`} text={profile.headline || `Connect with ${profile.displayName} on TapLex.`} label="Share page" /><button className="unpublish-button" type="button" onClick={() => void persist(false)}>Unpublish page</button></div></div> : null}
        </div>
      </section>

      <aside className="profile-preview-column">
        <div className="preview-column-heading"><span>Live preview</span><b>{profileSkins.find((skin) => skin.id === profile.skin)?.name}</b></div>
        <ProfilePhonePreview profile={profile} />
        <p>Changes appear here before you publish.</p>
      </aside>
    </main>
  );
}

function LogoCrop() {
  return <span className="profile-app-logo"><img src="/taplex-logo.webp" alt="" /></span>;
}

function Avatar({ profile, small = false }: { profile: TapLexProfile; small?: boolean }) {
  const src = profileImageUrl(profile.avatarKey);
  return <span className={small ? "editor-avatar small" : "editor-avatar"}>{src ? <img src={src} alt={`${profile.displayName} profile`} /> : <b>{profile.displayName.trim().charAt(0).toUpperCase() || "T"}</b>}</span>;
}

function EditorField({ label, value, onChange, maxLength, multiline = false, prefix, type = "text", placeholder, autoComplete }: { label: string; value: string; onChange: (value: string) => void; maxLength: number; multiline?: boolean; prefix?: string; type?: string; placeholder?: string; autoComplete?: string }) {
  return <label className={multiline ? "editor-field wide" : "editor-field"}><span>{label}<small>{value.length}/{maxLength}</small></span><div className={prefix ? "editor-input-with-prefix" : undefined}>{prefix ? <i>{prefix}</i> : null}{multiline ? <textarea value={value} maxLength={maxLength} placeholder={placeholder} autoComplete={autoComplete} onChange={(event) => onChange(event.target.value)} /> : <input type={type} value={value} maxLength={maxLength} placeholder={placeholder} autoComplete={autoComplete} onChange={(event) => onChange(event.target.value)} />}</div></label>;
}

function SocialEditorItem({ link, onToggle, onRemove }: { link: TapLexLink; onToggle: () => void; onRemove: () => void }) {
  return <div className="social-editor-item"><span className="social-icons-brand" data-platform={link.platform}><SocialGlyph platform={link.platform} /></span><div><b>{link.title}</b><small>{socialDisplayValue(link)}</small></div><button type="button" className={`link-toggle ${link.active ? "on" : ""}`} aria-label={`${link.active ? "Hide" : "Show"} ${link.title}`} onClick={onToggle}><i /></button><button type="button" className="remove-link" onClick={onRemove} aria-label={`Remove ${link.title}`}>×</button></div>;
}

function ModuleEditorItem({ link, mark, detail, onToggle, onRemove }: { link: TapLexLink; mark: string; detail: string; onToggle: () => void; onRemove: () => void }) {
  return <div className="module-editor-item"><span className="module-editor-mark">{mark}</span><div><b>{link.title}</b><small>{detail}</small>{link.description && link.kind === "booking" ? <p>{link.description}</p> : null}</div><button type="button" className={`link-toggle ${link.active ? "on" : ""}`} aria-label={`${link.active ? "Hide" : "Show"} ${link.title}`} onClick={onToggle}><i /></button><button type="button" className="remove-link" onClick={onRemove} aria-label={`Remove ${link.title}`}>×</button></div>;
}

function LinkEditorItem({ link, first, last, dragging, onDragStart, onDrop, onChange, onRemove, onMove }: { link: TapLexLink; first: boolean; last: boolean; dragging: boolean; onDragStart: () => void; onDrop: () => void; onChange: (patch: Partial<TapLexLink>) => void; onRemove: () => void; onMove: (direction: -1 | 1) => void }) {
  return <article className={`link-editor-item ${dragging ? "dragging" : ""}`} draggable onDragStart={onDragStart} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
    <span className="drag-handle" aria-hidden="true">⋮⋮</span>
    <span className="link-kind-mark">↗</span>
    <div className="link-editor-fields"><input aria-label="Link title" value={link.title} maxLength={70} onChange={(event) => onChange({ title: event.target.value })} /><input aria-label="Link URL" type="url" value={link.url} onChange={(event) => onChange({ url: event.target.value })} /></div>
    <button type="button" className={`link-toggle ${link.active ? "on" : ""}`} aria-label={`${link.active ? "Hide" : "Show"} ${link.title}`} onClick={() => onChange({ active: !link.active })}><i /></button>
    <div className="link-row-actions"><button type="button" disabled={first} onClick={() => onMove(-1)} aria-label="Move link up">↑</button><button type="button" disabled={last} onClick={() => onMove(1)} aria-label="Move link down">↓</button><button type="button" onClick={onRemove} aria-label={`Remove ${link.title}`}>×</button></div>
  </article>;
}

function ProfilePhonePreview({ profile }: { profile: TapLexProfile }) {
  const socials = profile.links.filter((link) => link.kind === "social" && link.active);
  const links = profile.links.filter((link) => link.kind === "link" && link.active);
  const video = profile.links.find((link) => link.kind === "video" && link.active);
  const support = profile.links.find((link) => link.kind === "support" && link.active);
  const booking = profile.links.find((link) => link.kind === "booking" && link.active);
  const location = profileLocationLabel(profile);
  return <div className={`builder-phone public-skin-${profile.skin}`}>
    <div className="builder-phone-rings" aria-hidden="true"><i /><i /><i /></div>
    <div className="builder-phone-top"><LogoCrop /><span>↗</span></div>
    <Avatar profile={profile} />
    <h2>{profile.displayName || "Your Name"}</h2><p>@{profile.handle || "yourname"}</p>{location ? <p className="builder-phone-location">⌖ {location}</p> : null}<h3>{profile.headline || "Your headline"}</h3>{profile.bio ? <p className="builder-phone-bio">{profile.bio}</p> : null}
    <div className={`builder-phone-socials social-icons-${profile.socialIconStyle}`}>{socials.slice(0, 6).map((link) => <span key={link.id} data-platform={link.platform}><SocialGlyph platform={link.platform} /></span>)}</div>
    <div className="builder-phone-links">{video ? <span><i>▶</i>{video.title}<b>›</b></span> : null}{links.slice(0, 4).map((link) => <span key={link.id}><i>{socialMark(link.platform)}</i>{link.title}<b>›</b></span>)}{booking ? <span><i>□</i>{booking.title}<b>{booking.priceLabel || "Book"}</b></span> : null}{support ? <span><i>$</i>Support me<b>QR</b></span> : null}{profile.contactEmail || profile.contactPhone ? <span><i>VC</i>Save my contact<b>›</b></span> : null}</div>
    <small>Powered by TapLex</small>
  </div>;
}

function NavIcon({ name }: { name: "home" | "profile" | "edit" | "connections" | "bag" | "external" }) {
  const paths = {
    home: <><path d="M3 11 12 3l9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
    profile: <><circle cx="12" cy="7" r="4" /><path d="M4 21c0-5 3-8 8-8s8 3 8 8" /></>,
    edit: <><path d="M4 20h4l11-11-4-4L4 16v4Z" /><path d="m13 7 4 4" /></>,
    connections: <><circle cx="8" cy="8" r="3" /><circle cx="17" cy="9" r="3" /><path d="M2 21c0-4 2-7 6-7 2 0 3.5.7 4.5 2" /><path d="M12 21c0-4 2-7 5-7s5 3 5 7" /></>,
    bag: <><path d="M5 8h14l1 13H4L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
    external: <><path d="M14 4h6v6" /><path d="m20 4-9 9" /><path d="M18 13v7H4V6h7" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function shortUrl(value: string) {
  try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return value; }
}

function socialDisplayValue(link: TapLexLink) {
  try {
    const url = new URL(link.url);
    if (link.platform === "whatsapp") return `+${url.pathname.replace(/\D/g, "")}`;
    const segment = url.pathname.split("/").filter(Boolean).at(-1);
    if (segment) return segment.startsWith("@") ? segment : `@${segment}`;
    return shortUrl(link.url);
  } catch {
    return link.url;
  }
}

function newClientId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `00000000-0000-4000-8000-${Date.now().toString().padStart(12, "0").slice(-12)}`;
}

function formatBookingDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatBookingTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}
