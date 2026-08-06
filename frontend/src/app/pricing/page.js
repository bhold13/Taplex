import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Pricing" };

export default function PricingPage() {
  return <PageScaffold page={getPage("pricing")} />;
}
