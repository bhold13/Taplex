import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Subscription" };

export default function SubscriptionPage() {
  return <PageScaffold page={getPage("subscription")} />;
}
