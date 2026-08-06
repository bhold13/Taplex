import Link from "next/link";
import { requireTapLexUser } from "@/app/user-auth";
import ConnectionsList from "@/components/customer/connections-list";
import { listConnections } from "@/lib/connections";
import { getOrCreateProfile } from "@/lib/profiles";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  const user = await requireTapLexUser("/connections");
  const [connections, profile] = await Promise.all([listConnections(user.email), getOrCreateProfile(user)]);
  return <main className="connections-shell">
    <header className="connections-header">
      <Link className="connections-brand" href="/"><span><img src="/taplex-logo.webp" alt="" /></span><b>TapLex</b></Link>
      <nav>{profile.published ? <Link href={`/p/${profile.handle}`}>My Profile</Link> : null}<Link href="/dashboard">Edit Profile</Link><Link className="selected" href="/connections">People I Met</Link></nav>
      <Link className="connections-back" href="/dashboard">Back to Edit Profile</Link>
    </header>
    <section className="connections-content">
      <div className="connections-intro"><p>YOUR PRIVATE NETWORK</p><h1>People I Met</h1><span>Save the connection while the moment is fresh. Only you can see this list and your private notes.</span></div>
      <ConnectionsList initialConnections={connections} />
    </section>
  </main>;
}
