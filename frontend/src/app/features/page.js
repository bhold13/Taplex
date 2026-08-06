import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Features" };

export default function FeaturesPage() {
  return <PageScaffold page={getPage("features")} />;
}
