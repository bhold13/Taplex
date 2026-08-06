import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return <PageScaffold page={getPage("analytics")} />;
}
