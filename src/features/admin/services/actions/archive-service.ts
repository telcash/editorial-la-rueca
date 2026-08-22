'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireEditorialStaff } from '@/services/auth/access.service';
import * as EditorialServiceService from '@/services/editorial-services/editorial-service.service';

const serviceIdSchema = z.string().uuid();

export async function archiveServiceAction(serviceId: string): Promise<void> {
  await requireEditorialStaff();

  const validServiceId = serviceIdSchema.parse(serviceId);

  await EditorialServiceService.archiveService(validServiceId);
  revalidatePath('/admin/services');
  revalidatePath(`/admin/services/${validServiceId}`);
}

export async function restoreServiceAction(serviceId: string): Promise<void> {
  await requireEditorialStaff();

  const validServiceId = serviceIdSchema.parse(serviceId);

  await EditorialServiceService.restoreService(validServiceId);
  revalidatePath('/admin/services');
  revalidatePath(`/admin/services/${validServiceId}`);
}
