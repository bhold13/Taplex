import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "About" };

export default function AboutPage() {
  return <PageScaffold page={getPage("about")} />;
}
