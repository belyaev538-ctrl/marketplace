"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";

type AdminShellProps = {
  children: React.ReactNode;
  userEmail: string | null;
};

export function AdminShell({ children, userEmail }: AdminShellProps) {
  return (
    <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-1 overflow-hidden bg-white">
      <AdminSidebar userEmail={userEmail} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
        <div className="min-h-0 flex-1 overflow-auto bg-white">{children}</div>
      </div>
    </div>
  );
}
