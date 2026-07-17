import { signOut } from '@/features/auth/actions/sign-out';

export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className={
          className ??
          'rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100'
        }
      >
        Cerrar sesion
      </button>
    </form>
  );
}
