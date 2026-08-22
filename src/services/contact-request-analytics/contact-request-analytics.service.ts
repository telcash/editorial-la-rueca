import 'server-only';

import * as contactRequestAnalyticsRepository from '@/repositories/contact-request-analytics/contact-request-analytics.repository';
import { createContactRequestAnalyticsService } from './contact-request-analytics.service.core';

export { createContactRequestAnalyticsService } from './contact-request-analytics.service.core';
export {
  contactRequestAnalyticsPeriods,
  contactRequestClosedStatuses,
  contactRequestOpenStatuses,
  type ContactRequestAnalyticsData,
  type ContactRequestAnalyticsPeriod,
  type ContactRequestAnalyticsRange,
  type ContactRequestAnalyticsRepository,
} from './contact-request-analytics.types';

const contactRequestAnalyticsService = createContactRequestAnalyticsService(
  contactRequestAnalyticsRepository,
);

export const { getAnalytics } = contactRequestAnalyticsService;
