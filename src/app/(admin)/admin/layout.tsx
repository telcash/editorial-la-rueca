import type { ReactNode } from 'react';

import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { requireEditorialStaff } from '@/services/auth/access.service';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const staff = await requireEditorialStaff();
  const displayName = staff.displayName ?? 'Equipo editorial';

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-sm text-neutral-500">Panel administrativo</p>
            <p className="font-medium text-neutral-950">{displayName}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-neutral-100 px-2.5 py-1 text-sm font-medium text-neutral-700">
              {staff.role}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
