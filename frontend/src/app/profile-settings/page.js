import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Profile Settings" };

export default function ProfileSettingsPage() {
  return <PageScaffold page={getPage("profile-settings")} />;
}
