import type { Profile } from '@/db/schema';

export type EditorialRole = Extract<Profile['role'], 'admin' | 'editor'>;

export function isEditorialRole(role: string | null | undefined): role is EditorialRole {
  return role === 'admin' || role === 'editor';
}
