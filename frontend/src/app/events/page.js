import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Events" };

export default function EventsPage() {
  return <PageScaffold page={getPage("events")} />;
}
