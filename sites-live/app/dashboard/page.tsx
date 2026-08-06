import { requireTapLexUser } from "@/app/user-auth";
import ProfileEditor from "@/components/customer/profile-editor";
import { getOwnerBookings } from "@/lib/bookings";
import { profileSkinFromValue } from "@/lib/profile-model";
import { getOrCreateProfile } from "@/lib/profiles";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ skin?: string }> }) {
  const selectedSkin = profileSkinFromValue((await searchParams).skin);
  const returnTo = selectedSkin ? `/dashboard?skin=${encodeURIComponent(selectedSkin)}` : "/dashboard";
  const user = await requireTapLexUser(returnTo);
  const [profile, bookings] = await Promise.all([
    getOrCreateProfile(user, selectedSkin ?? undefined),
    getOwnerBookings(user.email),
  ]);
  return <ProfileEditor initialProfile={profile} initialBookings={bookings} accountName={user.fullName ?? user.displayName} authSource={user.authSource} selectedSkin={selectedSkin} />;
}
