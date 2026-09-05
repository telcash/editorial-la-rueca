export const contactRequestUtmLimits = {
  utmSource: 160,
  utmMedium: 160,
  utmCampaign: 180,
  utmContent: 180,
  utmTerm: 180,
} as const;

export type ContactRequestUtmKey = keyof typeof contactRequestUtmLimits;
