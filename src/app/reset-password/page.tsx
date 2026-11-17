import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Réinitialisation" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <AuthForm mode="reset" token={token || ""} />;
}
