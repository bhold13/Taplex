import { assertSameOrigin, registerEmailUser, sessionCookie } from "@/lib/taplex-auth";
import { profileSkinFromValue } from "@/lib/profile-model";
import { assertFounderCodeAvailable, getOrCreateProfile, redeemFounderCode } from "@/lib/profiles";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json() as Record<string, unknown>;
    const promoCode = String(body.promoCode ?? "").trim();
    const selectedSkin = profileSkinFromValue(body.skin);
    if (promoCode) await assertFounderCodeAvailable(promoCode);
    const token = await registerEmailUser(body.name, body.email, body.password);
    if (promoCode) {
      const email = String(body.email ?? "").trim().toLowerCase();
      const displayName = String(body.name ?? "").trim();
      await getOrCreateProfile({ email, displayName, fullName: displayName, authSource: "email" }, selectedSkin ?? undefined);
      await redeemFounderCode(email, promoCode);
    }
    return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(token, new URL(request.url).protocol === "https:"), "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Account could not be created." }, { status: 400 });
  }
}
