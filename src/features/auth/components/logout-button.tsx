'use client';

import { useTransition } from 'react';
import { LogOut } from 'lucide-react';

import { signOut } from '@/features/auth/actions/sign-out';
import { cn } from '@/lib/utils';

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      className={cn(
        'flex w-full cursor-default items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50',
      )}
      onClick={() => {
        startTransition(() => {
          void signOut();
        });
      }}
    >
      <LogOut className="size-4" aria-hidden="true" />
      {isPending ? 'Cerrando sesión…' : 'Cerrar sesión'}
    </button>
  );
}
