import { buildVCard, getVCardFileName } from "@/lib/vcard";

const profile = {
  username: "bholddageneral",
  usernameLower: "bholddageneral",
  displayName: "B-Hold da General",
  bio: "Music, barbering, technology, and transformation.",
  category: "Artist and entrepreneur",
  phoneNumber: "+13235551234",
  phoneLabel: "Business",
  showPhoneNumber: true,
  contactEmail: "hello@taplex.app",
  socialLinks: [{ platform: "instagram", url: "https://instagram.com/bholddageneral" }]
};

describe("TapLex vCard", () => {
  it("includes public contact data and uses the expected filename", () => {
    const vcard = buildVCard(profile, "https://taplex.app/profile/bholddageneral");

    expect(vcard).toContain("FN:B-Hold da General");
    expect(vcard).toContain("TEL;TYPE=business:+13235551234");
    expect(vcard).toContain("EMAIL;TYPE=INTERNET:hello@taplex.app");
    expect(vcard).toContain("URL;TYPE=TapLex:https://taplex.app/profile/bholddageneral");
    expect(vcard).toContain("X-SOCIALPROFILE;TYPE=instagram:https://instagram.com/bholddageneral");
    expect(getVCardFileName(profile.username)).toBe("taplex-bholddageneral.vcf");
  });

  it("omits a private phone number", () => {
    const vcard = buildVCard({ ...profile, showPhoneNumber: false }, "https://taplex.app/profile/bholddageneral");

    expect(vcard).not.toContain("TEL;");
  });
});
