import 'server-only';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { findProfileByUserId } from '@/repositories/auth/profile.repository';
import { isEditorialRole, type EditorialRole } from './access.policy';

const userIdSchema = z.string().uuid();

export interface AuthenticatedUser {
  userId: string;
}

export interface EditorialStaff {
  userId: string;
  role: EditorialRole;
  displayName: string | null;
  avatarUrl: string | null;
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims.sub) {
    return null;
  }

  const parsedUserId = userIdSchema.safeParse(data.claims.sub);

  if (!parsedUserId.success) {
    return null;
  }

  return {
    userId: parsedUserId.data,
  };
}

export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}

async function getEditorialStaffForUser(user: AuthenticatedUser): Promise<EditorialStaff | null> {
  const profile = await findProfileByUserId(user.userId);

  if (!profile || !isEditorialRole(profile.role)) {
    return null;
  }

  return {
    userId: user.userId,
    role: profile.role,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
  };
}

export async function getCurrentEditorialStaff(): Promise<EditorialStaff | null> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  return getEditorialStaffForUser(user);
}

export async function requireEditorialStaff(): Promise<EditorialStaff> {
  const user = await requireAuthenticatedUser();
  const staff = await getEditorialStaffForUser(user);

  if (!staff) {
    redirect('/unauthorized');
  }

  return staff;
}
