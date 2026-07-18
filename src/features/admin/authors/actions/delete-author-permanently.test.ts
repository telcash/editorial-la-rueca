import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthorHasBooksError, AuthorMustBeArchivedError } from '@/services/authors/author.errors';

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAdmin: vi.fn(),
  deleteAuthorPermanently: vi.fn(),
  deleteAuthorImage: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('@/services/auth/access.service', () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock('@/services/authors/author.service', () => ({
  deleteAuthorPermanently: mocks.deleteAuthorPermanently,
}));

vi.mock('../services/author-image-service', () => ({
  deleteAuthorImage: mocks.deleteAuthorImage,
}));

const { deleteAuthorPermanentlyAction } = await import('./delete-author-permanently');

const authorId = '550e8400-e29b-41d4-a716-446655440000';
const photoUrl =
  'https://project.supabase.co/storage/v1/object/public/authors/550e8400-e29b-41d4-a716-446655440000/1d2e4f8a-2a8a-42b9-8d1f-9c8a1f4c7b61.jpg';

describe('deleteAuthorPermanentlyAction', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy.mockClear();
    mocks.requireAdmin.mockResolvedValue({ role: 'admin' });
    mocks.deleteAuthorPermanently.mockResolvedValue({
      id: authorId,
      photoUrl: null,
    });
    mocks.deleteAuthorImage.mockResolvedValue(undefined);
  });

  it('rejects callers that are not admins before deleting', async () => {
    mocks.requireAdmin.mockRejectedValue(new Error('unauthorized'));

    await expect(deleteAuthorPermanentlyAction(authorId, 'ELIMINAR')).rejects.toThrow(
      'unauthorized',
    );

    expect(mocks.deleteAuthorPermanently).not.toHaveBeenCalled();
  });

  it('rejects an incorrect confirmation', async () => {
    const result = await deleteAuthorPermanentlyAction(authorId, 'eliminar');

    expect(result).toEqual({
      success: false,
      message: 'Escribe ELIMINAR para confirmar la eliminación.',
    });
    expect(mocks.deleteAuthorPermanently).not.toHaveBeenCalled();
  });

  it('deletes as admin and revalidates authors', async () => {
    const result = await deleteAuthorPermanentlyAction(authorId, 'ELIMINAR');

    expect(result).toEqual({ success: true, message: null });
    expect(mocks.deleteAuthorPermanently).toHaveBeenCalledWith(authorId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/authors');
  });

  it('cleans up the author image after the database delete', async () => {
    mocks.deleteAuthorPermanently.mockResolvedValue({
      id: authorId,
      photoUrl,
    });

    await deleteAuthorPermanentlyAction(authorId, 'ELIMINAR');

    expect(mocks.deleteAuthorPermanently).toHaveBeenCalledWith(authorId);
    expect(mocks.deleteAuthorImage).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000/1d2e4f8a-2a8a-42b9-8d1f-9c8a1f4c7b61.jpg',
    );
  });

  it('does not fail the delete when storage cleanup fails', async () => {
    mocks.deleteAuthorPermanently.mockResolvedValue({
      id: authorId,
      photoUrl,
    });
    mocks.deleteAuthorImage.mockRejectedValue(new Error('storage failed'));

    await expect(deleteAuthorPermanentlyAction(authorId, 'ELIMINAR')).resolves.toEqual({
      success: true,
      message: null,
    });
  });

  it('maps domain errors to safe messages', async () => {
    mocks.deleteAuthorPermanently.mockRejectedValueOnce(new AuthorMustBeArchivedError());

    await expect(deleteAuthorPermanentlyAction(authorId, 'ELIMINAR')).resolves.toEqual({
      success: false,
      message: 'Archiva el autor antes de eliminarlo definitivamente.',
    });

    mocks.deleteAuthorPermanently.mockRejectedValueOnce(new AuthorHasBooksError(2));

    await expect(deleteAuthorPermanentlyAction(authorId, 'ELIMINAR')).resolves.toEqual({
      success: false,
      message: 'El autor está relacionado con 2 libros y no puede eliminarse.',
    });
  });
});
