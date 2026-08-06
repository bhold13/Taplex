import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Connections" };

export default function ConnectionsPage() {
  return <PageScaffold page={getPage("connections")} />;
}
