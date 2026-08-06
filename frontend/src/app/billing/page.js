import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Billing" };

export default function BillingPage() {
  return <PageScaffold page={getPage("billing")} />;
}
