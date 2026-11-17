import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/dashboard");
  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Administration</h1>
        <p className="mt-1 text-sm jm-muted">Panneau réservé au compte administrateur vérifié côté serveur.</p>
      </div>
      <AdminNav />
      {children}
    </div>
  );
}
