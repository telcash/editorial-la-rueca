import { UpdatePasswordForm } from '@/features/auth/components/update-password-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function UpdatePasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-6 space-y-2">
          <p className="text-sm font-medium text-neutral-600">Editorial La Rueca</p>
          <h1 className="text-2xl font-semibold tracking-normal text-neutral-950">
            Establecer nueva contraseña
          </h1>
          <p className="text-sm leading-6 text-neutral-600">
            Introduce una nueva contraseña para tu cuenta del panel.
          </p>
        </div>
        <UpdatePasswordForm redirectTo="/admin?feedback=passwordUpdated" />
      </section>
    </main>
  );
}
