import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['admin', 'editor']);

export const profiles = pgTable('profiles', {
  // The foreign key to auth.users is completed in the migration because auth.users is managed by Supabase.
  id: uuid('id').primaryKey(),
  displayName: varchar('display_name', { length: 120 }),
  avatarUrl: text('avatar_url'),
  role: userRole('role').default('editor').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export type Profile = InferSelectModel<typeof profiles>;
export type NewProfile = InferInsertModel<typeof profiles>;
