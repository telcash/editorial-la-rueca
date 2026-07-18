export const PERMANENT_DELETE_CONFIRMATION = 'ELIMINAR';

export function isPermanentDeleteConfirmationValid(value: string) {
  return value === PERMANENT_DELETE_CONFIRMATION;
}
