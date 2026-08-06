import {
  loadCurrentUserProfile,
  loadPublicProfileByUsername,
  normalizeUsername,
  saveCurrentUserProfile
} from "@/lib/profileStore";

jest.mock("@/lib/firebase/clientApp", () => ({
  getFirebaseAuth: jest.fn(),
  getFirebaseDb: jest.fn(),
  isFirebaseConfigured: () => false
}));

const sessionKey = "taplex.preview.session";

function setPreviewSession(uid, email) {
  window.localStorage.setItem(
    sessionKey,
    JSON.stringify({ uid, email, provider: "local-preview", signedInAt: new Date().toISOString() })
  );
}

function makeProfile(username, overrides = {}) {
  return {
    username,
    displayName: "B-Hold da General",
    bio: "Music, barbering, technology, and transformation.",
    category: "Artist and entrepreneur",
    location: "Los Angeles, CA",
    profilePhotoUrl: "https://example.com/profile.jpg",
    coverImageUrl: "",
    socialLinks: [{ platform: "instagram", label: "Instagram", url: "instagram.com/bholddageneral" }],
    mediaLinks: [{ label: "Featured music", url: "youtube.com/@bholddageneral" }],
    services: ["Custom music", "Barber services"],
    bookingUrl: "https://example.com/book",
    contactEmail: "hello@example.com",
    phoneNumber: "+13235551234",
    phoneLabel: "Business",
    showPhoneNumber: true,
    isPublic: true,
    ...overrides
  };
}

describe("profile persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("saves and reloads a local preview profile by uid and username", async () => {
    setPreviewSession("preview-owner", "owner@taplex.test");

    const saved = await saveCurrentUserProfile(makeProfile("BHoldDaGeneral"));
    const current = await loadCurrentUserProfile();
    const publicProfile = await loadPublicProfileByUsername("bholddageneral");

    expect(saved.uid).toBe("preview-owner");
    expect(saved.usernameLower).toBe("bholddageneral");
    expect(saved.plan).toBe("free");
    expect(saved.bookingUrl).toBe("");
    expect(saved.phoneNumber).toBe("+13235551234");
    expect(saved.showPhoneNumber).toBe(true);
    expect(current.profile.username).toBe("BHoldDaGeneral");
    expect(publicProfile.displayName).toBe("B-Hold da General");
  });

  it("keeps an optional phone private when visibility is disabled", async () => {
    setPreviewSession("preview-private", "private@taplex.test");

    const saved = await saveCurrentUserProfile(makeProfile("private-phone", { showPhoneNumber: false }));

    expect(saved.phoneNumber).toBe("+13235551234");
    expect(saved.showPhoneNumber).toBe(false);
  });

  it("prevents duplicate usernames and releases the previous lookup after a rename", async () => {
    setPreviewSession("preview-one", "one@taplex.test");
    await saveCurrentUserProfile(makeProfile("taplex.owner"));

    setPreviewSession("preview-two", "two@taplex.test");
    await expect(saveCurrentUserProfile(makeProfile("TAPLEX.OWNER"))).rejects.toMatchObject({
      code: "username-taken"
    });

    setPreviewSession("preview-one", "one@taplex.test");
    await saveCurrentUserProfile(makeProfile("taplex-renamed"));

    expect(await loadPublicProfileByUsername("taplex.owner")).toBeNull();
    expect((await loadPublicProfileByUsername("taplex-renamed")).uid).toBe("preview-one");
  });

  it("validates usernames and keeps the curated demo route available", async () => {
    expect(() => normalizeUsername("bad username")).toThrow(/letters, numbers/i);
    expect((await loadPublicProfileByUsername("demo")).username).toBe("demo");
  });
});
