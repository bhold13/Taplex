import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Messages" };

export default function MessagesPage() {
  return <PageScaffold page={getPage("messages")} />;
}
