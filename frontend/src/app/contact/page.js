import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return <PageScaffold page={getPage("contact")} />;
}
