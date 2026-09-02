'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { updateBookSalesConfigurationSchema } from '@/schemas/sales/sales.schema';
import { requireEditorialStaff } from '@/services/auth/access.service';
import {
  SalesChannelNotFoundError,
  SalesMarketChannelMismatchError,
  SalesMarketInactiveError,
  SalesMarketNotFoundError,
} from '@/services/sales/sales.errors';
import * as SalesService from '@/services/sales/sales.service';
import type { BookSalesActionState } from '../types/book-sales-form-state';

const bookIdSchema = z.string().uuid('El id del libro no es válido.');

function mapValidationErrors(error: z.ZodError): Record<string, string> {
  return Object.fromEntries(error.issues.map((issue) => [issue.path.join('.'), issue.message]));
}

export async function updateBookSalesAction(
  bookId: string,
  input: unknown,
): Promise<BookSalesActionState> {
  await requireEditorialStaff();

  const parsedBookId = bookIdSchema.safeParse(bookId);
  const parsedInput = updateBookSalesConfigurationSchema.safeParse(input);

  if (!parsedBookId.success) {
    return {
      success: false,
      fieldErrors: {},
      formError: 'No se pudo guardar la configuración comercial. Inténtalo de nuevo.',
    };
  }

  if (!parsedInput.success) {
    return {
      success: false,
      fieldErrors: mapValidationErrors(parsedInput.error),
      formError: null,
    };
  }

  try {
    await SalesService.updateBookSalesConfiguration(parsedBookId.data, parsedInput.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        fieldErrors: mapValidationErrors(error),
        formError: null,
      };
    }

    if (
      error instanceof SalesMarketNotFoundError ||
      error instanceof SalesMarketChannelMismatchError ||
      error instanceof SalesMarketInactiveError
    ) {
      return {
        success: false,
        fieldErrors: { 'quares.marketIds': error.message },
        formError: null,
      };
    }

    if (error instanceof SalesChannelNotFoundError) {
      return {
        success: false,
        fieldErrors: {},
        formError: error.message,
      };
    }

    return {
      success: false,
      fieldErrors: {},
      formError: 'No se pudo guardar la configuración comercial. Inténtalo de nuevo.',
    };
  }

  revalidatePath('/admin/books');
  revalidatePath(`/admin/books/${parsedBookId.data}`);

  return {
    success: true,
    fieldErrors: {},
    formError: null,
  };
}
