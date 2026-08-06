import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return <PageScaffold page={getPage("settings")} />;
}
