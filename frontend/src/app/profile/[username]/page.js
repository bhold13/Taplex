import PublicProfileClient from "@/components/PublicProfileClient";

export async function generateMetadata({ params }) {
  const { username } = await params;
  return {
    title: `@${username} | TapLex`,
    description: `View @${username}'s premium TapLex profile.`
  };
}

export default async function PublicProfilePage({ params }) {
  const { username } = await params;
  return <PublicProfileClient username={username} />;
}
