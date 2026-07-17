import type { ReactNode } from 'react';

import { AdminHeader } from './admin-header';
import { AdminSidebar } from './admin-sidebar';

interface AdminShellProps {
  children: ReactNode;
  user: {
    displayName: string | null;
    role: string;
    avatarUrl: string | null;
  };
}

export function AdminShell({ children, user }: AdminShellProps) {
  const displayName = user.displayName ?? 'Equipo editorial';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminHeader displayName={displayName} role={user.role} avatarUrl={user.avatarUrl} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
