import { verifySecureTap } from "@/lib/secure-nfc";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return Response.json(
    { verified: false, error: message },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function GET(request: Request, context: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await context.params;
  const url = new URL(request.url);
  const encryptedPiccHex = url.searchParams.get("e")?.trim() ?? "";
  const receivedMacHex = url.searchParams.get("c")?.trim() ?? "";

  if (!/^[0-9A-Fa-f]{32}$/.test(encryptedPiccHex) || !/^[0-9A-Fa-f]{16}$/.test(receivedMacHex)) {
    return errorResponse("Missing or invalid NTAG 424 SDM parameters.", 400);
  }

  try {
    const result = await verifySecureTap(publicId, encryptedPiccHex, receivedMacHex, request);
    if (!result.destination) {
      return Response.json(
        { verified: true, publicId: result.publicId, counter: result.counter, freshTap: result.freshTap },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }

    const destination = new URL(result.destination, request.url);
    return Response.redirect(destination, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : "TapLex Secure verification failed.";
    const status = /unknown/i.test(message) ? 404 : /not configured|not supported/i.test(message) ? 503 : 401;
    return errorResponse(message, status);
  }
}
