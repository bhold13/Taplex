import PageScaffold from "@/components/PageScaffold";
import { getClaimPage } from "@/lib/pageContent";

export async function generateMetadata({ params }) {
  const { tagId } = await params;
  return { title: `Claim ${tagId} | TapLex` };
}

export default async function ClaimPage({ params }) {
  const { tagId } = await params;
  return <PageScaffold page={getClaimPage(tagId)} />;
}
