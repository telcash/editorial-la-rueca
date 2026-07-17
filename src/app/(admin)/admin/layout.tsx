import type { ReactNode } from 'react';

import { AdminShell } from '@/features/admin/components/admin-shell';
import { requireEditorialStaff } from '@/services/auth/access.service';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const staff = await requireEditorialStaff();

  return (
    <AdminShell
      user={{
        displayName: staff.displayName,
        role: staff.role,
        avatarUrl: staff.avatarUrl,
      }}
    >
      {children}
    </AdminShell>
  );
}
