import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Marketplace" };

export default function MarketplacePage() {
  return <PageScaffold page={getPage("marketplace")} />;
}
