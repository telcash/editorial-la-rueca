import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      updateUser: mocks.updateUser,
    },
  })),
}));

const { requestPasswordReset } = await import('./request-password-reset');
const { updatePassword } = await import('./update-password');

function createResetFormData(email: string) {
  const formData = new FormData();
  formData.set('email', email);
  return formData;
}

function createUpdateFormData(password: string, confirmPassword = password) {
  const formData = new FormData();
  formData.set('password', password);
  formData.set('confirmPassword', confirmPassword);
  return formData;
}

describe('password auth actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://editorial.example.com/');
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
    mocks.updateUser.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('requests a Supabase password reset without revealing account existence', async () => {
    await expect(
      requestPasswordReset({} as never, createResetFormData('user@example.com')),
    ).resolves.toEqual(
      expect.objectContaining({
        success: true,
        formError: null,
      }),
    );

    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo:
        'https://editorial.example.com/auth/callback?next=%2Flogin%2Fupdate-password',
    });
  });

  it('does not use an untrusted Origin and returns a controlled error without site config', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');

    const state = await requestPasswordReset({} as never, createResetFormData('user@example.com'));

    expect(state).toEqual({
      success: false,
      fieldErrors: {},
      formError: 'No se pudo solicitar el enlace. Inténtalo de nuevo más tarde.',
      values: { email: 'user@example.com' },
    });
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('returns field errors for invalid reset email before Supabase call', async () => {
    const state = await requestPasswordReset({} as never, createResetFormData('invalid'));

    expect(state.fieldErrors.email).toBeDefined();
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('updates the authenticated user password and redirects', async () => {
    await expect(
      updatePassword({ redirectTo: '/admin' }, {} as never, createUpdateFormData('new-password')),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'new-password' });
    expect(mocks.redirect).toHaveBeenCalledWith('/admin');
  });

  it('returns field errors for password mismatch', async () => {
    const state = await updatePassword(
      { redirectTo: '/admin' },
      {} as never,
      createUpdateFormData('new-password', 'different-password'),
    );

    expect(state.fieldErrors.confirmPassword).toBeDefined();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
});
