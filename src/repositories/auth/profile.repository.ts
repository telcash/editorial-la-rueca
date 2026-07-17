import 'server-only';

import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { profiles, type Profile } from '@/db/schema';

export async function findProfileByUserId(userId: string): Promise<Profile | null> {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);

  return profile ?? null;
}
