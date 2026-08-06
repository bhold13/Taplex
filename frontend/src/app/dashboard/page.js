import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return <PageScaffold page={getPage("dashboard")} />;
}
