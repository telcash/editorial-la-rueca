import type { ReactNode } from 'react';
import type { Metadata } from 'next';

import { AdminShell } from '@/features/admin/components/admin-shell';
import { requireEditorialStaff } from '@/services/auth/access.service';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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
