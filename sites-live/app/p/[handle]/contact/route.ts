import { getPublicProfile } from "@/lib/profiles";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ handle: string }> }) {
  const { handle } = await context.params;
  const profile = await getPublicProfile(handle);
  if (!profile || (!profile.contactEmail && !profile.contactPhone)) return new Response("Contact card not found.", { status: 404 });

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${vcardEscape(profile.displayName)}`,
    profile.headline ? `TITLE:${vcardEscape(profile.headline)}` : "",
    profile.contactEmail ? `EMAIL;TYPE=INTERNET:${vcardEscape(profile.contactEmail)}` : "",
    profile.contactPhone ? `TEL;TYPE=CELL:${vcardEscape(profile.contactPhone)}` : "",
    `URL:${new URL(`/p/${profile.handle}`, "https://taplex.co").toString()}`,
    "END:VCARD",
  ].filter(Boolean);

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${profile.handle}.vcf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function vcardEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
