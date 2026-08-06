import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { getTapLexUser } from "@/app/user-auth";
import TagActivation from "@/components/nfc/tag-activation";
import { appleAuthConfigured } from "@/lib/apple-auth";
import { findNfcTagBySlug, recordNfcTap } from "@/lib/nfc";
import { runtimeEnv } from "@/lib/runtime";
import { getOrCreateProfile, listOwnerProfiles } from "@/lib/profiles";

export const dynamic = "force-dynamic";

export default async function TagPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { slug } = await params;
  const preview = (await searchParams).preview === "1";
  const tag = await findNfcTagBySlug(slug);
  if (!tag) notFound();
  if (!preview && tag.status === "active" && tag.profile_handle) {
    const incoming = await headers();
    await recordNfcTap(tag, new Request(`https://taplex.co/t/${slug}`, { headers: Object.fromEntries(incoming.entries()) }));
    redirect(`/p/${tag.profile_handle}`);
  }
  const user = await getTapLexUser();
  if (user && tag.status === "unclaimed" && !preview) await getOrCreateProfile(user);
  const profiles = user ? await listOwnerProfiles(user.email) : [];
  return <TagActivation tag={tag} slug={slug} user={user} preview={preview} googleConfigured={Boolean(runtimeEnv.GOOGLE_CLIENT_ID)} appleConfigured={appleAuthConfigured()} profiles={profiles} />;
}
