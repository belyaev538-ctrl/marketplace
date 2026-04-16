import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email ?? null;

  return <AdminShell userEmail={userEmail}>{children}</AdminShell>;
}
