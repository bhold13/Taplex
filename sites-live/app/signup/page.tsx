import { getTapLexUser } from "@/app/user-auth";
import AuthGateway from "@/components/customer/auth-gateway";
import { profileSkinFromReturnPath, profileSkinFromValue } from "@/lib/profile-model";
import { safeReturnPath } from "@/lib/return-path";

export const dynamic = "force-dynamic";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string; skin?: string; return_to?: string }> }) {
  const params = await searchParams;
  const requestedReturnTo = safeReturnPath(params.return_to);
  const selectedSkin = profileSkinFromValue(params.skin) ?? profileSkinFromReturnPath(requestedReturnTo);
  const returnTo = selectedSkin ? `/dashboard?skin=${encodeURIComponent(selectedSkin)}` : requestedReturnTo;
  return <AuthGateway intent="create" user={await getTapLexUser()} error={params.error} returnTo={returnTo} selectedSkin={selectedSkin} />;
}
