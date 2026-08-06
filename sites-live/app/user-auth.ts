import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getSessionUser, SESSION_COOKIE, type TapLexUser } from "@/lib/taplex-auth";

export async function getTapLexUser(): Promise<TapLexUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? null;
  const localUser = await getSessionUser(token);
  if (localUser) return localUser;
  const chatgpt = await getChatGPTUser();
  return chatgpt ? { ...chatgpt, authSource: "chatgpt" } : null;
}

export async function requireTapLexUser(returnTo: string) {
  const user = await getTapLexUser();
  if (user) return user;
  redirect(`/login?return_to=${encodeURIComponent(returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard")}`);
}
