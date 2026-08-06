import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Discover" };

export default function DiscoverPage() {
  return <PageScaffold page={getPage("discover")} />;
}
