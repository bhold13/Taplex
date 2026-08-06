import { getTapLexUser } from "@/app/user-auth";
import type { TapLexUser } from "@/lib/taplex-auth";

type ProfileAuthorization =
  | { ok: true; user: TapLexUser }
  | { ok: false; response: Response };

export async function authorizeProfileApi(request: Request): Promise<ProfileAuthorization> {
  const user = await getTapLexUser();
  if (!user) {
    return { ok: false, response: Response.json({ error: "Sign in is required." }, { status: 401 }) };
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const requestOrigin = new URL(request.url).origin;
    const origin = request.headers.get("origin");
    const fetchSite = request.headers.get("sec-fetch-site");
    if ((origin && origin !== requestOrigin) || fetchSite === "cross-site") {
      return { ok: false, response: Response.json({ error: "Cross-site request rejected." }, { status: 403 }) };
    }
  }

  return { ok: true, user };
}
