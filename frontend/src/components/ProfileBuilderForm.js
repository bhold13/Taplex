"use client";

import Link from "next/link";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  Camera,
  Globe,
  ImageUp,
  Trash2,
  Instagram,
  LoaderCircle,
  Mail,
  MapPin,
  Music2,
  Phone,
  Save,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { uploadGalleryImage, uploadProfileImage, validateImageFile } from "@/lib/profileImageUpload";
import { canUseBooking, loadCurrentUserProfile, saveCurrentUserProfile } from "@/lib/profileStore";

import styles from "./ProfileBuilderForm.module.css";

const emptyForm = {
  profilePhotoUrl: "",
  coverImageUrl: "",
  galleryItems: [],
  username: "",
  displayName: "",
  category: "",
  location: "",
  bio: "",
  contactEmail: "",
  phoneNumber: "",
  phoneLabel: "Mobile",
  showPhoneNumber: false,
  website: "",
  instagram: "",
  mediaLabel: "Featured media",
  mediaLink: "",
  serviceOne: "",
  serviceTwo: "",
  bookingUrl: ""
};

function findSocialLink(profile, platform) {
  return profile?.socialLinks?.find((link) => link.platform === platform)?.url || "";
}

function profileToForm(profile) {
  if (!profile) {
    return emptyForm;
  }

  return {
    profilePhotoUrl: profile.profilePhotoUrl || "",
    coverImageUrl: profile.coverImageUrl || "",
    galleryItems: Array.isArray(profile.galleryItems) ? profile.galleryItems : [],
    username: profile.username || "",
    displayName: profile.displayName || "",
    category: profile.category || "",
    location: profile.location || "",
    bio: profile.bio || "",
    contactEmail: profile.contactEmail || "",
    phoneNumber: profile.phoneNumber || "",
    phoneLabel: profile.phoneLabel || "Mobile",
    showPhoneNumber: profile.showPhoneNumber === true,
    website: findSocialLink(profile, "website"),
    instagram: findSocialLink(profile, "instagram"),
    mediaLabel: profile.mediaLinks?.[0]?.label || "Featured media",
    mediaLink: profile.mediaLinks?.[0]?.url || "",
    serviceOne: profile.services?.[0] || "",
    serviceTwo: profile.services?.[1] || "",
    bookingUrl: profile.bookingUrl || ""
  };
}

function buildProfileInput(form) {
  return {
    username: form.username,
    displayName: form.displayName,
    bio: form.bio,
    category: form.category,
    location: form.location,
    profilePhotoUrl: form.profilePhotoUrl,
    coverImageUrl: form.coverImageUrl,
    galleryItems: form.galleryItems,
    socialLinks: [
      { platform: "instagram", label: "Instagram", url: form.instagram },
      { platform: "website", label: "Website", url: form.website }
    ],
    mediaLinks: [{ label: form.mediaLabel || "Featured media", url: form.mediaLink }],
    services: [form.serviceOne, form.serviceTwo],
    bookingUrl: form.bookingUrl,
    contactEmail: form.contactEmail,
    phoneNumber: form.phoneNumber,
    phoneLabel: form.phoneLabel,
    showPhoneNumber: form.showPhoneNumber,
    isPublic: true
  };
}

function previewHref(value) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "#";
  }

  return /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default function ProfileBuilderForm() {
  const [form, setForm] = useState(emptyForm);
  const [mode, setMode] = useState("loading");
  const [identity, setIdentity] = useState(null);
  const [plan, setPlan] = useState("free");
  const [savedUsername, setSavedUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreviews, setImagePreviews] = useState({ profile: "", cover: "" });
  const [uploads, setUploads] = useState({
    profile: { status: "idle", progress: 0, message: "" },
    cover: { status: "idle", progress: 0, message: "" }
  });
  const [galleryUpload, setGalleryUpload] = useState({ status: "idle", progress: 0, message: "" });
  const [status, setStatus] = useState({ message: "", tone: "neutral" });

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      try {
        const context = await loadCurrentUserProfile();

        if (!isActive) {
          return;
        }

        setMode(context.mode);
        setIdentity(context.identity);
        setPlan(context.profile?.plan || "free");
        setSavedUsername(context.profile?.usernameLower || "");
        setForm(profileToForm(context.profile));
      } catch (error) {
        if (isActive) {
          setMode("error");
          setStatus({ message: error.message || "Your profile could not be loaded.", tone: "error" });
        }
      }
    }

    loadProfile();

    return () => {
      isActive = false;
    };
  }, []);

  const canBook = canUseBooking(plan);
  const publicPath = savedUsername ? `/profile/${savedUsername}` : "";
  const typedPublicPath = useMemo(
    () => `/profile/${form.username.trim().toLowerCase() || "username"}`,
    [form.username]
  );
  const publicUrl = `taplex.app${savedUsername ? publicPath : typedPublicPath}`;
  const initials = (form.displayName || form.username || "T")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const services = [form.serviceOne, form.serviceTwo].filter((service) => service.trim());
  const isUploading = uploads.profile.status === "uploading" || uploads.cover.status === "uploading" || galleryUpload.status === "uploading";
  const isBusy = mode === "loading" || isSaving || isUploading;
  const profilePhotoPreview = imagePreviews.profile || form.profilePhotoUrl;
  const coverImagePreview = imagePreviews.cover || form.coverImageUrl;

  function updateField(field, value) {
    setStatus({ message: "", tone: "neutral" });
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateUpload(kind, value) {
    setUploads((current) => ({ ...current, [kind]: { ...current[kind], ...value } }));
  }

  async function handleImageUpload(kind, event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const field = kind === "cover" ? "coverImageUrl" : "profilePhotoUrl";

    try {
      validateImageFile(file);
      updateUpload(kind, { status: "uploading", progress: 0, message: "" });
      setStatus({ message: "", tone: "neutral" });

      const reader = new FileReader();
      reader.onload = () => setImagePreviews((current) => ({ ...current, [kind]: reader.result }));
      reader.readAsDataURL(file);

      const imageUrl = await uploadProfileImage({
        file,
        kind,
        onProgress: (progress) => updateUpload(kind, { progress })
      });

      setForm((current) => ({ ...current, [field]: imageUrl }));
      setImagePreviews((current) => ({ ...current, [kind]: imageUrl }));
      updateUpload(kind, { status: "success", progress: 100, message: "Upload complete" });
    } catch (error) {
      setImagePreviews((current) => ({ ...current, [kind]: "" }));
      updateUpload(kind, {
        status: "error",
        progress: 0,
        message: error.message || "Image upload failed."
      });
    } finally {
      event.target.value = "";
    }
  }

  async function handleGalleryUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    if (form.galleryItems.length + files.length > 12) {
      setGalleryUpload({ status: "error", progress: 0, message: "You can publish up to 12 work photos." });
      event.target.value = "";
      return;
    }
    setGalleryUpload({ status: "uploading", progress: 0, message: "" });
    try {
      const added = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        validateImageFile(file);
        const uploaded = await uploadGalleryImage({ file, onProgress: (progress) => setGalleryUpload({ status: "uploading", progress: Math.round(((index + progress / 100) / files.length) * 100), message: "" }) });
        added.push({ id: uploaded.id, url: uploaded.url, caption: "", alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") });
      }
      setForm((current) => ({ ...current, galleryItems: [...current.galleryItems, ...added] }));
      setGalleryUpload({ status: "success", progress: 100, message: `${added.length} photo${added.length === 1 ? "" : "s"} ready. Save your profile to publish.` });
    } catch (error) {
      setGalleryUpload({ status: "error", progress: 0, message: error.message || "Gallery upload failed." });
    } finally { event.target.value = ""; }
  }

  function updateGalleryItem(id, field, value) {
    setForm((current) => ({ ...current, galleryItems: current.galleryItems.map((item) => item.id === id ? { ...item, [field]: value } : item) }));
  }

  function removeGalleryItem(id) {
    setForm((current) => ({ ...current, galleryItems: current.galleryItems.filter((item) => item.id !== id) }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setIsSaving(true);
    setStatus({ message: "Saving your profile...", tone: "neutral" });

    try {
      const profile = await saveCurrentUserProfile(buildProfileInput(form));
      setForm(profileToForm(profile));
      setPlan(profile.plan);
      setSavedUsername(profile.usernameLower);
      setStatus({
        message: `Profile saved. Your public page is ready at /profile/${profile.usernameLower}.`,
        tone: "success"
      });
    } catch (error) {
      setStatus({ message: error.message || "Your profile could not be saved.", tone: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className={styles.builderShell} aria-label="TapLex profile setup">
      <div className={styles.setupPane}>
        <div className={styles.setupIntro}>
          <div className={styles.introLine}>
            <span>Profile Builder</span>
            <strong>{plan} plan</strong>
          </div>
          <h2>Build a clean tap profile in minutes.</h2>
          <p>
            Add the essentials people need after they scan: who you are, what you do, what you offer,
            and the best way to reach you.
          </p>
        </div>

        {mode === "loading" ? (
          <div className={styles.modeNotice} role="status">
            <LoaderCircle className={styles.spinner} size={18} aria-hidden="true" />
            Loading your saved profile...
          </div>
        ) : null}
        {mode === "local" ? (
          <div className={styles.modeNotice}>
            <ShieldCheck size={18} aria-hidden="true" />
            Local preview mode: this profile is saved permanently in this browser. Add Firebase env values
            to sync it across devices.
          </div>
        ) : null}
        {mode === "firebase" && !identity ? (
          <div className={styles.modeNotice} data-tone="error">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>
              <Link href="/login">Sign in</Link> before saving a cloud profile.
            </span>
          </div>
        ) : null}

        <form className={styles.formGrid} onSubmit={saveProfile} aria-busy={isBusy}>
          <fieldset className={styles.formFields} disabled={isBusy}>
            <div className={`${styles.imageUploadGrid} ${styles.wide}`}>
              <article className={styles.uploadCard}>
                <div className={styles.uploadPreview}>
                  {profilePhotoPreview ? <img src={profilePhotoPreview} alt="Profile preview" /> : <Camera size={26} aria-hidden="true" />}
                </div>
                <div className={styles.uploadCopy}>
                  <strong>Profile photo</strong>
                  <span>JPG, PNG, WebP, or GIF - 5 MB max</span>
                </div>
                <label className={styles.uploadButton}>
                  <ImageUp size={17} aria-hidden="true" />
                  {uploads.profile.status === "uploading" ? `${uploads.profile.progress}%` : "Upload photo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) => handleImageUpload("profile", event)}
                    disabled={isBusy || (mode === "firebase" && !identity)}
                  />
                </label>
                {uploads.profile.status === "uploading" ? (
                  <progress value={uploads.profile.progress} max="100" aria-label="Profile photo upload progress" />
                ) : null}
                {uploads.profile.message ? <small data-tone={uploads.profile.status}>{uploads.profile.message}</small> : null}
              </article>

              <article className={styles.uploadCard}>
                <div className={`${styles.uploadPreview} ${styles.coverUploadPreview}`}>
                  {coverImagePreview ? <img src={coverImagePreview} alt="Cover preview" /> : <ImageUp size={26} aria-hidden="true" />}
                </div>
                <div className={styles.uploadCopy}>
                  <strong>Cover image</strong>
                  <span>Wide images work best - 5 MB max</span>
                </div>
                <label className={styles.uploadButton}>
                  <ImageUp size={17} aria-hidden="true" />
                  {uploads.cover.status === "uploading" ? `${uploads.cover.progress}%` : "Upload cover"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) => handleImageUpload("cover", event)}
                    disabled={isBusy || (mode === "firebase" && !identity)}
                  />
                </label>
                {uploads.cover.status === "uploading" ? (
                  <progress value={uploads.cover.progress} max="100" aria-label="Cover image upload progress" />
                ) : null}
                {uploads.cover.message ? <small data-tone={uploads.cover.status}>{uploads.cover.message}</small> : null}
              </article>
            </div>
            <div className={`${styles.galleryManager} ${styles.wide}`}>
              <div className={styles.galleryManagerHeading}><div><strong>Work gallery</strong><span>Add photos of your art, cuts, products, events, projects, or other work.</span></div><label className={styles.uploadButton}><ImageUp size={17} aria-hidden="true" />{galleryUpload.status === "uploading" ? `${galleryUpload.progress}%` : "Add work photos"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={handleGalleryUpload} disabled={isBusy || (mode === "firebase" && !identity)} /></label></div>
              {galleryUpload.status === "uploading" ? <progress value={galleryUpload.progress} max="100" aria-label="Gallery upload progress" /> : null}
              {galleryUpload.message ? <small data-tone={galleryUpload.status}>{galleryUpload.message}</small> : null}
              {form.galleryItems.length ? <div className={styles.galleryEditorGrid}>{form.galleryItems.map((item, index) => <article key={item.id}><img src={item.url} alt="" /><label>Caption<input value={item.caption} maxLength={120} placeholder="Describe this work" onChange={(event) => updateGalleryItem(item.id, "caption", event.target.value)} /></label><label>Image description<input value={item.alt} maxLength={160} placeholder="Describe the photo for screen readers" onChange={(event) => updateGalleryItem(item.id, "alt", event.target.value)} /></label><button type="button" onClick={() => removeGalleryItem(item.id)} aria-label={`Remove work photo ${index + 1}`}><Trash2 size={16} /> Remove</button></article>)}</div> : <p className={styles.emptyGallery}>No work photos yet. Add your best work when you’re ready.</p>}
            </div>
            <label>
              Display name
              <input
                value={form.displayName}
                onChange={(event) => updateField("displayName", event.target.value)}
              />
            </label>
            <label>
              Username
              <input
                value={form.username}
                maxLength={30}
                pattern="[A-Za-z0-9._-]+"
                title="Use only letters, numbers, dots, underscores, and hyphens."
                onChange={(event) => updateField("username", event.target.value)}
                required
              />
            </label>
            <label className={styles.wide}>
              Bio
              <textarea value={form.bio} onChange={(event) => updateField("bio", event.target.value)} rows={3} />
            </label>
            <label>
              Main profession/category
              <input value={form.category} onChange={(event) => updateField("category", event.target.value)} />
            </label>
            <label>
              Location optional
              <input value={form.location} onChange={(event) => updateField("location", event.target.value)} />
            </label>

            <div className={styles.sectionTitle}>Links</div>
            <label>
              Instagram
              <input
                placeholder="instagram.com/yourname"
                value={form.instagram}
                onChange={(event) => updateField("instagram", event.target.value)}
              />
            </label>
            <label>
              Website or main link
              <input value={form.website} onChange={(event) => updateField("website", event.target.value)} />
            </label>
            <label>
              Media title
              <input value={form.mediaLabel} onChange={(event) => updateField("mediaLabel", event.target.value)} />
            </label>
            <label>
              Music/video/media link
              <input value={form.mediaLink} onChange={(event) => updateField("mediaLink", event.target.value)} />
            </label>

            <div className={styles.sectionTitle}>Services</div>
            <label>
              Service 1
              <input value={form.serviceOne} onChange={(event) => updateField("serviceOne", event.target.value)} />
            </label>
            <label>
              Service 2
              <input value={form.serviceTwo} onChange={(event) => updateField("serviceTwo", event.target.value)} />
            </label>

            <div className={styles.sectionTitle}>Contact and booking</div>
            <label>
              Contact email
              <input
                type="email"
                value={form.contactEmail}
                onChange={(event) => updateField("contactEmail", event.target.value)}
              />
            </label>
            <label>
              Phone number optional
              <input
                type="tel"
                placeholder="+13235551234"
                value={form.phoneNumber}
                onChange={(event) => updateField("phoneNumber", event.target.value)}
              />
            </label>
            <label>
              Phone label
              <select value={form.phoneLabel} onChange={(event) => updateField("phoneLabel", event.target.value)}>
                <option>Mobile</option>
                <option>Business</option>
                <option>Booking</option>
                <option>Management</option>
              </select>
            </label>
            <label>
              Booking link
              <input
                placeholder={canBook ? "https://your-booking-page.com" : "Upgrade to Pro to add booking"}
                value={form.bookingUrl}
                onChange={(event) => updateField("bookingUrl", event.target.value)}
                disabled={!canBook || isBusy}
              />
            </label>

            <label className={`${styles.phoneToggle} ${styles.wide}`}>
              <input
                type="checkbox"
                checked={form.showPhoneNumber}
                onChange={(event) => updateField("showPhoneNumber", event.target.checked)}
                disabled={!form.phoneNumber || isBusy}
              />
              <span>
                <strong>Show phone number on public profile</strong>
                <small>Leave this off to keep your number private and out of downloaded contacts.</small>
              </span>
            </label>

            {!canBook ? (
              <div className={styles.upgradePrompt}>
                <CalendarClock size={18} aria-hidden="true" />
                <span>
                  <strong>Upgrade to Pro to add booking.</strong> Free profiles still include your bio,
                  links, services, and contact button.
                </span>
                <Link href="/pricing">See plans</Link>
              </div>
            ) : null}

            <div className={styles.buttonRow}>
              <button className={styles.saveButton} type="submit" disabled={isBusy || (mode === "firebase" && !identity)}>
                {isSaving ? <LoaderCircle className={styles.spinner} size={17} aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
                {isSaving ? "Saving..." : "Save Profile"}
              </button>
              {publicPath ? (
                <Link className={styles.previewLink} href={publicPath}>
                  Preview Profile
                </Link>
              ) : (
                <span className={styles.previewLink} data-disabled="true">
                  Save to Preview
                </span>
              )}
            </div>
          </fieldset>

          {status.message ? (
            <p className={styles.status} data-tone={status.tone} role={status.tone === "error" ? "alert" : "status"}>
              {status.message}
            </p>
          ) : null}
        </form>

        <div className={styles.generatedLinks}>
          <div>
            <span>Public TapLex page</span>
            <strong>{publicUrl}</strong>
          </div>
        </div>
      </div>

      <aside className={styles.previewPane} aria-label="Live TapLex public profile preview">
        <div className={styles.phoneFrame}>
          {coverImagePreview ? (
            <div
              className={styles.coverPreview}
              style={{ backgroundImage: `url("${coverImagePreview.replaceAll('"', "%22")}")` }}
              aria-hidden="true"
            />
          ) : null}
          <div className={styles.previewHeader}>
            <span className={styles.avatar}>
              {profilePhotoPreview ? <img src={profilePhotoPreview} alt="" /> : initials}
            </span>
            {plan === "business" ? <BadgeCheck size={20} aria-label="Verified profile" /> : null}
          </div>
          <div>
            <h2>{form.displayName || "Your name"}</h2>
            <span className={styles.username}>@{form.username || "username"}</span>
          </div>
          <p className={styles.headline}>{form.bio || "Your bio will appear here."}</p>

          <div className={styles.metaRow}>
            {form.category ? (
              <span>
                <BriefcaseBusiness size={14} aria-hidden="true" />
                {form.category}
              </span>
            ) : null}
            {form.location ? (
              <span>
                <MapPin size={14} aria-hidden="true" />
                {form.location}
              </span>
            ) : null}
          </div>

          <div className={styles.socials} aria-label="Profile links">
            {form.instagram ? (
              <a href={previewHref(form.instagram)} aria-label="Instagram">
                <Instagram size={18} />
              </a>
            ) : null}
            {form.mediaLink ? (
              <a href={previewHref(form.mediaLink)} aria-label="Media">
                <Music2 size={18} />
              </a>
            ) : null}
            {form.website ? (
              <a href={previewHref(form.website)} aria-label="Website">
                <Globe size={18} />
              </a>
            ) : null}
          </div>

          <div className={styles.linkStack}>
            {form.contactEmail ? (
              <a href={`mailto:${form.contactEmail}`}>
                <Mail size={16} />
                Contact Me
              </a>
            ) : null}
            {form.showPhoneNumber && form.phoneNumber ? (
              <a href={`tel:${form.phoneNumber}`}>
                <Phone size={16} />
                {form.phoneLabel || "Phone"}
              </a>
            ) : null}
            {form.mediaLink ? (
              <a href={previewHref(form.mediaLink)}>
                <Sparkles size={16} />
                {form.mediaLabel || "Featured media"}
              </a>
            ) : null}
            {canBook && form.bookingUrl ? (
              <a className={styles.bookingLink} href={previewHref(form.bookingUrl)}>
                <CalendarClock size={16} />
                Book Now
              </a>
            ) : null}
          </div>

          {services.length ? (
            <div className={styles.serviceList}>
              {services.map((service) => (
                <span key={service}>{service}</span>
              ))}
            </div>
          ) : null}
        </div>
      </aside>
    </section>
  );
}
