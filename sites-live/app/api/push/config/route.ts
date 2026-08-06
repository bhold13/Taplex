import { runtimeEnv } from "@/lib/runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const firebase = {
    apiKey: runtimeEnv.FIREBASE_API_KEY?.trim() ?? "",
    authDomain: runtimeEnv.FIREBASE_AUTH_DOMAIN?.trim() ?? "",
    projectId: runtimeEnv.FIREBASE_PROJECT_ID?.trim() ?? "",
    storageBucket: runtimeEnv.FIREBASE_STORAGE_BUCKET?.trim() ?? "",
    messagingSenderId: runtimeEnv.FIREBASE_MESSAGING_SENDER_ID?.trim() ?? "",
    appId: runtimeEnv.FIREBASE_APP_ID?.trim() ?? "",
  };
  const vapidKey = runtimeEnv.FIREBASE_VAPID_KEY?.trim() ?? "";
  const configured = Object.values(firebase).every(Boolean) && Boolean(vapidKey);

  return Response.json(configured ? { configured, firebase, vapidKey } : { configured: false }, {
    headers: { "Cache-Control": "no-store" },
  });
}
