import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";

import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "./firebase/clientApp";
import { getLocalPreviewIdentity } from "./localPreviewAuth";

const localStoreKey = "taplex.profile.store.v1";
const usernamePattern = /^[A-Za-z0-9._-]+$/;
const allowedPlans = new Set(["free", "pro", "business"]);

export const demoProfile = {
  uid: "taplex-demo",
  username: "demo",
  usernameLower: "demo",
  displayName: "TapLex Demo",
  bio: "A premium tap profile for creators, professionals, and community builders ready to turn attention into opportunity.",
  category: "Creator and community builder",
  location: "Los Angeles, CA",
  profilePhotoUrl: "/taplex-logo-dark.png",
  coverImageUrl: "/taplex-logo-dark.png",
  galleryItems: [],
  phoneNumber: "+13235551234",
  phoneLabel: "Business",
  showPhoneNumber: true,
  socialLinks: [
    { platform: "instagram", label: "Instagram", url: "https://instagram.com/taplex" },
    { platform: "website", label: "TapLex", url: "https://taplex.app" }
  ],
  mediaLinks: [
    { label: "See the TapLex vision", url: "https://taplex.app" }
  ],
  services: ["Premium digital identity", "Creator and business networking"],
  bookingUrl: "https://taplex.app/pricing",
  contactEmail: "hello@taplex.app",
  plan: "business",
  isPublic: true,
  isVerified: true,
  createdAt: "2026-07-14T00:00:00.000Z",
  updatedAt: "2026-07-14T00:00:00.000Z"
};

export class ProfileStoreError extends Error {
  constructor(message, code = "profile-error") {
    super(message);
    this.name = "ProfileStoreError";
    this.code = code;
  }
}

export function canUseBooking(plan) {
  return plan === "pro" || plan === "business";
}

export function normalizeUsername(value) {
  const username = String(value || "").trim();

  if (!username) {
    throw new ProfileStoreError("Username is required.", "invalid-username");
  }

  if (username.length > 30) {
    throw new ProfileStoreError("Username must be 30 characters or fewer.", "invalid-username");
  }

  if (!usernamePattern.test(username) || username === "." || username === "..") {
    throw new ProfileStoreError(
      "Use only letters, numbers, dots, underscores, and hyphens in your username.",
      "invalid-username"
    );
  }

  return { username, usernameLower: username.toLowerCase() };
}

function normalizePlan(value) {
  return allowedPlans.has(value) ? value : "free";
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeUrl(value, label) {
  const trimmed = normalizeText(value);

  if (!trimmed) {
    return "";
  }

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("Unsupported protocol");
    }

    return parsed.toString();
  } catch {
    throw new ProfileStoreError(`${label} must be a valid web address.`, "invalid-url");
  }
}

function normalizeImageUrl(value, label) {
  const trimmed = normalizeText(value);

  if (/^data:image\/(?:jpeg|png|webp|gif);base64,/i.test(trimmed)) {
    if (isFirebaseConfigured()) {
      throw new ProfileStoreError(`${label} must be uploaded to Firebase Storage.`, "invalid-image-url");
    }

    return trimmed;
  }

  return normalizeUrl(trimmed, label);
}

function normalizeEmail(value) {
  const email = normalizeText(value).toLowerCase();

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ProfileStoreError("Contact email must be a valid email address.", "invalid-email");
  }

  return email;
}

function normalizePhone(value) {
  const phoneNumber = normalizeText(value);

  if (phoneNumber && !/^\+?[0-9().\-\s]{7,25}$/.test(phoneNumber)) {
    throw new ProfileStoreError("Phone number must contain only valid phone characters.", "invalid-phone");
  }

  return phoneNumber;
}

function normalizeLinks(links, defaultLabel) {
  return (Array.isArray(links) ? links : []).flatMap((link, index) => {
    const url = normalizeUrl(link?.url, link?.label || defaultLabel);

    if (!url) {
      return [];
    }

    return [
      {
        platform: normalizeText(link?.platform || "link").toLowerCase(),
        label: normalizeText(link?.label) || `${defaultLabel} ${index + 1}`,
        url
      }
    ];
  });
}

function normalizeProfileInput(input) {
  const { username, usernameLower } = normalizeUsername(input.username);
  const phoneNumber = normalizePhone(input.phoneNumber);

  return {
    username,
    usernameLower,
    displayName: normalizeText(input.displayName),
    bio: normalizeText(input.bio),
    category: normalizeText(input.category),
    location: normalizeText(input.location),
    profilePhotoUrl: normalizeImageUrl(input.profilePhotoUrl, "Profile photo"),
    coverImageUrl: normalizeImageUrl(input.coverImageUrl, "Cover image"),
    galleryItems: (Array.isArray(input.galleryItems) ? input.galleryItems : []).slice(0, 12).map((item, index) => ({
      id: normalizeText(item?.id) || `gallery-${index + 1}`,
      url: normalizeImageUrl(item?.url, `Gallery image ${index + 1}`),
      caption: normalizeText(item?.caption).slice(0, 120),
      alt: normalizeText(item?.alt).slice(0, 160) || `Work sample ${index + 1}`
    })).filter((item) => item.url),
    socialLinks: normalizeLinks(input.socialLinks, "Social link"),
    mediaLinks: normalizeLinks(input.mediaLinks, "Media link").map(({ label, url }) => ({ label, url })),
    services: (Array.isArray(input.services) ? input.services : []).map(normalizeText).filter(Boolean),
    bookingUrl: normalizeUrl(input.bookingUrl, "Booking link"),
    contactEmail: normalizeEmail(input.contactEmail),
    ...(phoneNumber
      ? {
          phoneNumber,
          phoneLabel: normalizeText(input.phoneLabel) || "Mobile",
          showPhoneNumber: input.showPhoneNumber === true
        }
      : { phoneLabel: "", showPhoneNumber: false }),
    isPublic: input.isPublic !== false
  };
}

function getBrowserStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

function readLocalStore() {
  const storage = getBrowserStorage();

  if (!storage) {
    return { version: 1, profiles: {}, usernames: {} };
  }

  try {
    const value = JSON.parse(storage.getItem(localStoreKey) || "null");

    if (value?.version === 1 && value.profiles && value.usernames) {
      return value;
    }
  } catch {
    // A malformed preview store should not prevent the builder from opening.
  }

  return { version: 1, profiles: {}, usernames: {} };
}

function writeLocalStore(store) {
  const storage = getBrowserStorage();

  if (!storage) {
    throw new ProfileStoreError("Local profile storage is unavailable in this browser.", "storage-unavailable");
  }

  storage.setItem(localStoreKey, JSON.stringify(store));
}

function saveLocalProfile(uid, input) {
  const normalized = normalizeProfileInput(input);
  const store = readLocalStore();
  const existing = store.profiles[uid];
  const usernameOwner = store.usernames[normalized.usernameLower];

  if (usernameOwner && usernameOwner.uid !== uid) {
    throw new ProfileStoreError("That username is already taken. Try another one.", "username-taken");
  }

  const now = new Date().toISOString();
  const plan = normalizePlan(existing?.plan);
  const profile = {
    uid,
    ...normalized,
    bookingUrl: canUseBooking(plan) ? normalized.bookingUrl : "",
    plan,
    isVerified: existing?.isVerified === true,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  if (
    existing?.usernameLower &&
    existing.usernameLower !== normalized.usernameLower &&
    store.usernames[existing.usernameLower]?.uid === uid
  ) {
    delete store.usernames[existing.usernameLower];
  }

  store.profiles[uid] = profile;
  store.usernames[normalized.usernameLower] = {
    uid,
    username: normalized.username,
    createdAt: usernameOwner?.createdAt || now
  };
  writeLocalStore(store);

  return profile;
}

async function getFirebaseUser() {
  const auth = getFirebaseAuth();

  if (typeof auth.authStateReady === "function") {
    await auth.authStateReady();
  }

  return auth.currentUser;
}

async function saveFirebaseProfile(uid, input) {
  const normalized = normalizeProfileInput(input);
  const database = getFirebaseDb();
  const profileRef = doc(database, "profiles", uid);

  return runTransaction(database, async (transaction) => {
    const profileSnapshot = await transaction.get(profileRef);
    const existing = profileSnapshot.exists() ? profileSnapshot.data() : null;
    const usernameRef = doc(database, "usernames", normalized.usernameLower);
    const oldUsernameRef =
      existing?.usernameLower && existing.usernameLower !== normalized.usernameLower
        ? doc(database, "usernames", existing.usernameLower)
        : null;
    const [usernameSnapshot, oldUsernameSnapshot] = await Promise.all([
      transaction.get(usernameRef),
      oldUsernameRef ? transaction.get(oldUsernameRef) : Promise.resolve(null)
    ]);

    if (usernameSnapshot.exists() && usernameSnapshot.data().uid !== uid) {
      throw new ProfileStoreError("That username is already taken. Try another one.", "username-taken");
    }

    const plan = normalizePlan(existing?.plan);
    const now = new Date().toISOString();
    const profile = {
      uid,
      ...normalized,
      bookingUrl: canUseBooking(plan) ? normalized.bookingUrl : "",
      plan,
      isVerified: existing?.isVerified === true,
      createdAt: existing?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (oldUsernameRef && oldUsernameSnapshot?.exists() && oldUsernameSnapshot.data().uid === uid) {
      transaction.delete(oldUsernameRef);
    }

    transaction.set(usernameRef, {
      uid,
      username: normalized.username,
      createdAt: usernameSnapshot.exists() ? usernameSnapshot.data().createdAt : serverTimestamp()
    });
    transaction.set(profileRef, profile);

    return {
      ...profile,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
  });
}

export async function loadCurrentUserProfile() {
  if (isFirebaseConfigured()) {
    const user = await getFirebaseUser();

    if (!user) {
      return { mode: "firebase", identity: null, profile: null };
    }

    const snapshot = await getDoc(doc(getFirebaseDb(), "profiles", user.uid));

    return {
      mode: "firebase",
      identity: { uid: user.uid, email: user.email || "", provider: "firebase" },
      profile: snapshot.exists() ? snapshot.data() : null
    };
  }

  const identity = getLocalPreviewIdentity();
  const store = readLocalStore();

  return {
    mode: "local",
    identity,
    profile: identity ? store.profiles[identity.uid] || null : null
  };
}

export async function saveCurrentUserProfile(input) {
  if (isFirebaseConfigured()) {
    const user = await getFirebaseUser();

    if (!user) {
      throw new ProfileStoreError("Sign in before saving your TapLex profile.", "auth-required");
    }

    return saveFirebaseProfile(user.uid, input);
  }

  const identity = getLocalPreviewIdentity();

  if (!identity) {
    throw new ProfileStoreError("Local preview storage is unavailable.", "storage-unavailable");
  }

  return saveLocalProfile(identity.uid, input);
}

export async function loadPublicProfileByUsername(value) {
  let usernameLower;

  try {
    usernameLower = normalizeUsername(value).usernameLower;
  } catch {
    return null;
  }

  if (usernameLower === "demo") {
    return demoProfile;
  }

  let profile = null;

  if (isFirebaseConfigured()) {
    const database = getFirebaseDb();
    const usernameSnapshot = await getDoc(doc(database, "usernames", usernameLower));

    if (usernameSnapshot.exists()) {
      const profileSnapshot = await getDoc(doc(database, "profiles", usernameSnapshot.data().uid));
      profile = profileSnapshot.exists() ? profileSnapshot.data() : null;
    }
  } else {
    const store = readLocalStore();
    const lookup = store.usernames[usernameLower];
    profile = lookup ? store.profiles[lookup.uid] || null : null;
  }

  if (profile && profile.isPublic !== false) {
    return profile;
  }

  return null;
}
