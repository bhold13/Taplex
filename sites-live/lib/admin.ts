import { getChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";
import { runtimeEnv } from "@/lib/runtime";

type AdminAuthorization =
  | { ok: true; user: ChatGPTUser }
  | { ok: false; response: Response };

export function isConfiguredAdmin(email: string): boolean {
  const allowed = runtimeEnv.ADMIN_EMAIL?.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean) ?? [];

  return allowed.includes(email.trim().toLowerCase());
}

export async function authorizeAdminApi(request: Request): Promise<AdminAuthorization> {
  const user = await getChatGPTUser();
  if (!user) {
    return { ok: false, response: Response.json({ error: "Sign in is required." }, { status: 401 }) };
  }

  if (!runtimeEnv.ADMIN_EMAIL) {
    return { ok: false, response: Response.json({ error: "Owner access is not configured." }, { status: 503 }) };
  }

  if (!isConfiguredAdmin(user.email)) {
    return { ok: false, response: Response.json({ error: "Owner access required." }, { status: 403 }) };
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
