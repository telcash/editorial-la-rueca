import { redirect } from 'next/navigation';

import { LoginForm } from '@/features/auth/components/login-form';
import { getAuthenticatedUser, getCurrentEditorialStaff } from '@/services/auth/access.service';

export default async function LoginPage() {
  const user = await getAuthenticatedUser();

  if (user) {
    const staff = await getCurrentEditorialStaff();

    if (staff) {
      redirect('/admin');
    }

    redirect('/unauthorized');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4 py-12">
      <section className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-950">Acceso editorial</h1>
          <p className="text-sm text-neutral-600">
            Entra con tu correo y contrasena para acceder al panel.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
