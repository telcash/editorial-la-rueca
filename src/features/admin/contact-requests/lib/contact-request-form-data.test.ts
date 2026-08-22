import { describe, expect, it } from 'vitest';

import type { ContactRequestAdminDetail } from '@/services/contact-requests/contact-request.types';
import {
  getContactRequestAdminFormValues,
  getContactRequestAdminFormValuesFromContactRequest,
  getContactRequestAdminUpdateInput,
} from './contact-request-form-data';

const baseContactRequest: ContactRequestAdminDetail = {
  id: 'c89ff281-8f18-4c90-b4b6-ec7de7414103',
  name: 'Ana Pérez',
  email: 'ana@example.com',
  phone: '+34 600 111 222',
  province: 'Madrid',
  serviceId: 'f3f6a49f-c418-4522-b311-a70b88aab7f4',
  message: 'Quiero publicar mi libro con acompañamiento editorial.',
  status: 'new',
  source: 'website',
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  utmTerm: null,
  emailSentAt: null,
  emailError: null,
  internalNotes: null,
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  updatedAt: new Date('2026-01-01T10:00:00.000Z'),
  service: {
    id: 'f3f6a49f-c418-4522-b311-a70b88aab7f4',
    name: 'Corrección de manuscrito',
    slug: 'correccion-de-manuscrito',
  },
};

describe('contact request admin form data helpers', () => {
  it('extracts admin update values from FormData', () => {
    const formData = new FormData();
    formData.set('status', 'contacted');
    formData.set('serviceId', 'f3f6a49f-c418-4522-b311-a70b88aab7f4');
    formData.set('internalNotes', 'Llamar el jueves');

    expect(getContactRequestAdminFormValues(formData)).toEqual({
      status: 'contacted',
      serviceId: 'f3f6a49f-c418-4522-b311-a70b88aab7f4',
      internalNotes: 'Llamar el jueves',
    });
    expect(getContactRequestAdminUpdateInput(formData)).toEqual({
      status: 'contacted',
      serviceId: 'f3f6a49f-c418-4522-b311-a70b88aab7f4',
      internalNotes: 'Llamar el jueves',
    });
  });

  it('maps nullable internal notes to an empty form string', () => {
    expect(getContactRequestAdminFormValuesFromContactRequest(baseContactRequest)).toEqual({
      status: 'new',
      serviceId: 'f3f6a49f-c418-4522-b311-a70b88aab7f4',
      internalNotes: '',
    });
  });
});
