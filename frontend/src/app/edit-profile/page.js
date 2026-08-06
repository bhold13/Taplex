import PageScaffold from "@/components/PageScaffold";
import { getPage } from "@/lib/pageContent";

export const metadata = { title: "Edit Profile" };

export default function EditProfilePage() {
  return <PageScaffold page={getPage("edit-profile")} />;
}
