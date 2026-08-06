import { notFound } from "next/navigation";
import PublicProfile from "@/components/customer/public-profile";
import { getPublicProfile, isProfileOwner } from "@/lib/profiles";
import { getTapLexUser } from "@/app/user-auth";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = await getPublicProfile(handle);
  if (!profile) notFound();
  const user = await getTapLexUser();
  const owner = user ? await isProfileOwner(handle, user.email) : false;
  return <PublicProfile profile={profile} isOwner={owner} isSignedIn={Boolean(user)} />;
}
