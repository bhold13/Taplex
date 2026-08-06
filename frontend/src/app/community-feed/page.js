import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Community Feed" };

export default function CommunityFeedPage() {
  return <PageScaffold page={getPage("community-feed")} />;
}
