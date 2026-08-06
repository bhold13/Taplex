import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Support" };

export default function SupportPage() {
  return <PageScaffold page={getPage("support")} />;
}
