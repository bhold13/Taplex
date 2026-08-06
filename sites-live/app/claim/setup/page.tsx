import { notFound } from "next/navigation";
import { requireTapLexUser } from "@/app/user-auth";
import TagSetupWizard from "@/components/nfc/tag-setup-wizard";
import { getOwnedNfcSetup } from "@/lib/nfc";
import { getOrCreateProfile } from "@/lib/profiles";

export const dynamic = "force-dynamic";

export default async function ClaimSetupPage({ searchParams }: { searchParams: Promise<{ unit?: string }> }) {
  const unitId = (await searchParams).unit ?? "";
  const user = await requireTapLexUser(`/claim/setup?unit=${encodeURIComponent(unitId)}`);
  let product: Record<string, unknown>;
  try { product = await getOwnedNfcSetup(unitId, user); } catch { notFound(); }
  return <TagSetupWizard profile={await getOrCreateProfile(user)} product={product} />;
}
