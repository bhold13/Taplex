import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Admin Dashboard" };

export default function AdminDashboardPage() {
  return <PageScaffold page={getPage("admin-dashboard")} />;
}
