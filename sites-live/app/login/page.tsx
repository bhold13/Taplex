import { getTapLexUser } from "@/app/user-auth";
import AuthGateway from "@/components/customer/auth-gateway";
import { profileSkinFromReturnPath } from "@/lib/profile-model";
import { safeReturnPath } from "@/lib/return-path";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; return_to?: string }> }) {
  const params = await searchParams;
  const returnTo = safeReturnPath(params.return_to);
  return <AuthGateway user={await getTapLexUser()} error={params.error} returnTo={returnTo} selectedSkin={profileSkinFromReturnPath(returnTo)} />;
}
