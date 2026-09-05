import { z } from 'zod';

import { createContactRequestSchema } from '@/schemas/contact-requests/contact-request.schema';

export const publicContactSchema = createContactRequestSchema
  .pick({
    name: true,
    email: true,
    phone: true,
    province: true,
    serviceId: true,
    message: true,
    utmSource: true,
    utmMedium: true,
    utmCampaign: true,
    utmContent: true,
    utmTerm: true,
  })
  .extend({
    company: z.string().max(0).optional(),
  })
  .strict();

export type PublicContactInput = z.infer<typeof publicContactSchema>;
