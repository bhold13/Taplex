import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Profile Builder" };

export default function ProfileBuilderPage() {
  return <PageScaffold page={getPage("profile-builder")} />;
}
