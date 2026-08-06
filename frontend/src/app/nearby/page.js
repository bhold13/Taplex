import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Nearby" };

export default function NearbyPage() {
  return <PageScaffold page={getPage("nearby")} />;
}
