import Link from 'next/link';

import { PasswordResetRequestForm } from '@/features/auth/components/password-reset-request-form';

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-6 space-y-2">
          <Link
            href="/login"
            className="text-sm font-medium text-neutral-600 hover:text-neutral-950"
          >
            Editorial La Rueca
          </Link>
          <h1 className="text-2xl font-semibold tracking-normal text-neutral-950">
            Recuperar contraseña
          </h1>
          <p className="text-sm leading-6 text-neutral-600">
            Escribe tu correo y te enviaremos un enlace seguro para establecer una nueva contraseña.
          </p>
        </div>
        <PasswordResetRequestForm />
      </section>
    </main>
  );
}
