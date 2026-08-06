function escapeVCardValue(value) {
  return String(value || "")
    .replaceAll("\\", "\\\\")
    .replaceAll("\r\n", "\n")
    .replaceAll("\n", "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
}

function safeType(value) {
  return String(value || "social").replace(/[^a-z0-9-]/gi, "").toLowerCase() || "social";
}

export function buildVCard(profile, publicProfileUrl) {
  const displayName = profile.displayName || profile.username;
  const note = profile.bio || profile.category || `Connect with @${profile.username} on TapLex.`;
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCardValue(displayName)}`,
    `N:;${escapeVCardValue(displayName)};;;`,
    `NICKNAME:@${escapeVCardValue(profile.username)}`
  ];

  if (profile.category) {
    lines.push(`TITLE:${escapeVCardValue(profile.category)}`);
  }

  lines.push(`NOTE:${escapeVCardValue(note)}`);

  if (profile.showPhoneNumber && profile.phoneNumber) {
    lines.push(`TEL;TYPE=${safeType(profile.phoneLabel || "mobile")}:${escapeVCardValue(profile.phoneNumber)}`);
  }

  if (profile.contactEmail) {
    lines.push(`EMAIL;TYPE=INTERNET:${escapeVCardValue(profile.contactEmail)}`);
  }

  lines.push(`URL;TYPE=TapLex:${escapeVCardValue(publicProfileUrl)}`);

  for (const link of profile.socialLinks || []) {
    if (link.url) {
      lines.push(`X-SOCIALPROFILE;TYPE=${safeType(link.platform)}:${escapeVCardValue(link.url)}`);
    }
  }

  lines.push("END:VCARD");

  return `${lines.join("\r\n")}\r\n`;
}

export function getVCardFileName(username) {
  const safeUsername = String(username || "profile")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-");

  return `taplex-${safeUsername || "profile"}.vcf`;
}
