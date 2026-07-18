const adminDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function formatAdminDate(date: Date) {
  return adminDateFormatter.format(date).replace('.', '');
}
