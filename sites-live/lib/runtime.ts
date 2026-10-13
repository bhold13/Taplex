export type TapLexRuntimeEnv = {
  ADMIN_EMAIL?: string;
  BUCKET?: R2Bucket;
  DB?: D1Database;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  APPLE_CLIENT_ID?: string;
  APPLE_TEAM_ID?: string;
  APPLE_KEY_ID?: string;
  APPLE_PRIVATE_KEY?: string;
  RESEND_API_KEY?: string;
  PASSWORD_RESET_FROM_EMAIL?: string;
  TAP_ANALYTICS_SALT?: string;
  NTAG424_DEV_META_KEY?: string;
  NTAG424_DEV_FILE_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  FIREBASE_API_KEY?: string;
  FIREBASE_AUTH_DOMAIN?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_STORAGE_BUCKET?: string;
  FIREBASE_MESSAGING_SENDER_ID?: string;
  FIREBASE_APP_ID?: string;
  FIREBASE_VAPID_KEY?: string;
};

export type TapLexWorkerEnv = TapLexRuntimeEnv & CloudflareEnv & {
  ASSETS: Fetcher;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
};

export const runtimeEnv: TapLexRuntimeEnv = {};

export function bindRuntimeEnv(nextEnv: TapLexRuntimeEnv) {
  for (const key of Object.keys(runtimeEnv) as Array<keyof TapLexRuntimeEnv>) delete runtimeEnv[key];
  Object.assign(runtimeEnv, nextEnv);
}

export function requireDatabase(): D1Database {
  if (!runtimeEnv.DB) throw new Error("TapLex database is unavailable.");
  return runtimeEnv.DB;
}

export function requireBucket(): R2Bucket {
  if (!runtimeEnv.BUCKET) throw new Error("TapLex product storage is unavailable.");
  return runtimeEnv.BUCKET;
}
