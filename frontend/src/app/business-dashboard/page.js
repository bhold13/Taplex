import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Business Dashboard" };

export default function BusinessDashboardPage() {
  return <PageScaffold page={getPage("business-dashboard")} />;
}
