export const archiveStatusValues = ['active', 'archived', 'all'] as const;

export type ArchiveStatus = (typeof archiveStatusValues)[number];

export function parseArchiveStatus(value: string | string[] | undefined): ArchiveStatus {
  const status = Array.isArray(value) ? value[0] : value;

  return archiveStatusValues.find((archiveStatus) => archiveStatus === status) ?? 'active';
}
