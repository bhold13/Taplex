import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return <PageScaffold page={getPage("notifications")} />;
}
