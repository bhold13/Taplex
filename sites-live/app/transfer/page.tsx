import { getTapLexUser } from "@/app/user-auth";
import TransferAccept from "@/components/nfc/transfer-accept";
import { appleAuthConfigured } from "@/lib/apple-auth";
import { runtimeEnv } from "@/lib/runtime";

export const dynamic = "force-dynamic";

export default async function TransferPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  return <TransferAccept token={token} user={await getTapLexUser()} googleConfigured={Boolean(runtimeEnv.GOOGLE_CLIENT_ID)} appleConfigured={appleAuthConfigured()} />;
}
