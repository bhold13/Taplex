import { getClaimPage, getPage, getPublicProfile } from "@/lib/pageContent";

describe("page content registry", () => {
  it("returns required static pages", () => {
    expect(getPage("dashboard").title).toMatch(/profile studio/i);
    expect(getPage("discover").title).toMatch(/talent/i);
    expect(getPage("settings").title).toMatch(/settings/i);
  });

  it("builds dynamic profile and NFC pages", () => {
    expect(getPublicProfile("demo").title).toContain("demo");
    expect(getClaimPage("tag-123").title).toContain("tag-123");
  });
});
