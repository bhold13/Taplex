import { authorizeAdminApi } from "@/lib/admin";
import { ensureDatabaseSchema } from "@/lib/database";
import { requireDatabase } from "@/lib/runtime";

export const dynamic = "force-dynamic";

type CustomerRow = {
  id: string;
  email: string;
  display_name: string;
  auth_method: string;
  created_at: string;
  handle: string | null;
  plan: string | null;
  published: number | null;
  promo_code: string | null;
  pro_expires_at: string | null;
};

export async function GET(request: Request) {
  const auth = await authorizeAdminApi(request);
  if (!auth.ok) return auth.response;
  await ensureDatabaseSchema();
  const result = await requireDatabase().prepare(`SELECT * FROM (
    SELECT COALESCE(u.id,p.id) AS id,p.owner_email AS email,COALESCE(u.display_name,p.display_name) AS display_name,
      CASE WHEN u.google_sub IS NOT NULL THEN 'Google' WHEN u.id IS NOT NULL THEN 'Email' ELSE 'ChatGPT' END AS auth_method,
      COALESCE(u.created_at,p.created_at) AS created_at,p.handle,p.plan,p.published,p.pro_expires_at,
      (SELECT code FROM promo_redemptions r WHERE r.profile_id = p.id LIMIT 1) AS promo_code
    FROM profiles p LEFT JOIN taplex_users u ON u.email = p.owner_email
    UNION ALL
    SELECT u.id,u.email,u.display_name,CASE WHEN u.google_sub IS NOT NULL THEN 'Google' ELSE 'Email' END,
      u.created_at,NULL,NULL,NULL,NULL,NULL
    FROM taplex_users u WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.owner_email = u.email)
  ) ORDER BY created_at DESC LIMIT 250`).all<CustomerRow>();
  return Response.json({ customers: (result.results ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    authMethod: row.auth_method,
    createdAt: row.created_at,
    handle: row.handle,
    plan: row.plan === "pro" && (!row.pro_expires_at || Date.parse(row.pro_expires_at) > Date.now()) ? "pro" : "free",
    published: Boolean(row.published),
    promoCode: row.promo_code,
  })) });
}
