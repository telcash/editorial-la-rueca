import { SignOutButton } from '@/features/auth/components/sign-out-button';

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4 py-12">
      <section className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-neutral-950">Acceso no autorizado</h1>
          <p className="text-sm leading-6 text-neutral-700">
            Esta cuenta no tiene permisos para acceder al panel editorial.
          </p>
        </div>
        <div className="mt-6">
          <SignOutButton className="inline-flex w-full items-center justify-center rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800" />
        </div>
      </section>
    </main>
  );
}
