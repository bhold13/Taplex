import { isValidEmail, normalizeEmail } from "@/lib/emailSubscribers";

describe("email subscriber validation", () => {
  test("normalizes email addresses", () => expect(normalizeEmail("  USER@Example.COM ")).toBe("user@example.com"));
  test.each([["person@example.com", true], ["missing-at.example.com", false], ["a@b", false], ["", false]])("validates %s", (email, expected) => expect(isValidEmail(email)).toBe(expected));
});
