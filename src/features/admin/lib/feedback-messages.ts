const feedbackMessages = {
  authorCreated: 'Autor creado correctamente.',
  authorUpdated: 'Autor actualizado correctamente.',
  authorArchived: 'Autor archivado correctamente.',
  authorRestored: 'Autor restaurado correctamente.',
  authorDeleted: 'Autor eliminado definitivamente.',
  authorPhotoUploadFailed:
    'El autor fue creado, pero no se pudo subir la fotografía. Puedes intentarlo de nuevo desde edición.',
  bookCreated: 'Libro creado correctamente.',
  bookUpdated: 'Libro actualizado correctamente.',
  bookArchived: 'Libro archivado correctamente.',
  bookRestored: 'Libro restaurado correctamente.',
  bookDeleted: 'Libro eliminado definitivamente.',
  categoryCreated: 'Categoría creada correctamente.',
  categoryUpdated: 'Categoría actualizada correctamente.',
  categoryArchived: 'Categoría archivada correctamente.',
  categoryRestored: 'Categoría restaurada correctamente.',
  categoryDeleted: 'Categoría eliminada definitivamente.',
  serviceCreated: 'Servicio creado correctamente.',
  serviceUpdated: 'Servicio actualizado correctamente.',
  serviceArchived: 'Servicio archivado correctamente.',
  serviceRestored: 'Servicio restaurado correctamente.',
  contactRequestUpdated: 'Solicitud actualizada correctamente.',
  contactRequestDeleted: 'Solicitud eliminada definitivamente.',
  contactRequestNotificationSent: 'Notificación enviada correctamente.',
  contactRequestNotificationSentUnconfirmed:
    'La notificación se envió, pero no se pudo confirmar su estado en el CRM.',
  contactRequestNotificationFailed:
    'No se pudo reenviar la notificación. La solicitud se conserva y el error quedó registrado.',
  testimonialCreated: 'Testimonio creado correctamente.',
  testimonialUpdated: 'Testimonio actualizado correctamente.',
  passwordUpdated: 'Contraseña actualizada correctamente.',
} as const;

export type AdminFeedbackKey = keyof typeof feedbackMessages;

export function getAdminFeedbackMessage(value: string | undefined): string | null {
  if (!value || !(value in feedbackMessages)) {
    return null;
  }

  return feedbackMessages[value as AdminFeedbackKey];
}
