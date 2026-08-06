import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return <PageScaffold page={getPage("terms")} />;
}
