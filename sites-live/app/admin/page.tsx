import Link from "next/link";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { isConfiguredAdmin } from "@/lib/admin";
import { runtimeEnv } from "@/lib/runtime";
import AdminDashboard from "./admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");

  if (!runtimeEnv.ADMIN_EMAIL) {
    return <AccessMessage title="Owner access is being configured." detail="The TapLex storefront is still available while the private dashboard is connected." />;
  }

  if (!isConfiguredAdmin(user.email)) {
    return <AccessMessage title="Owner access required." detail="This account is signed in, but it is not authorized to manage TapLex products." />;
  }

  return <AdminDashboard displayName={user.fullName ?? user.displayName} />;
}

function AccessMessage({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="admin-access-shell">
      <section>
        <p className="eyebrow"><span /> TapLex owner portal</p>
        <h1>{title}</h1>
        <p>{detail}</p>
        <div className="admin-access-actions">
          <Link className="button button-gold" href="/">Return Home</Link>
          <a className="button button-outline" href="/signout-with-chatgpt?return_to=/">Log Out</a>
        </div>
      </section>
    </main>
  );
}
