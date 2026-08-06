import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return <PageScaffold page={getPage("privacy")} />;
}
