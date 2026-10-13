import { resolveDevelopmentSecureTap } from "@/lib/secure-nfc";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const encryptedPiccHex = url.searchParams.get("e")?.trim() ?? "";
  const receivedMacHex = url.searchParams.get("c")?.trim() ?? "";

  if (!/^[0-9A-Fa-f]{32}$/.test(encryptedPiccHex) || !/^[0-9A-Fa-f]{16}$/.test(receivedMacHex)) {
    return Response.json(
      { verified: false, error: "Missing or invalid NTAG 424 SDM parameters." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const result = await resolveDevelopmentSecureTap(encryptedPiccHex, receivedMacHex);
    const canonical = new URL(`/s/${encodeURIComponent(result.publicId)}`, request.url);
    canonical.searchParams.set("e", encryptedPiccHex);
    canonical.searchParams.set("c", receivedMacHex);
    return Response.redirect(canonical, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : "TapLex Secure verification failed.";
    const status = /not been registered/i.test(message) ? 404 : /not configured/i.test(message) ? 503 : 401;
    return Response.json(
      { verified: false, error: message },
      { status, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
