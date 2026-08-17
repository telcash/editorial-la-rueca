export const AUTHOR_TESTIMONIALS_SEED_CONFIRMATION = 'TESTIMONIAL_SEED';

export function assertAuthorTestimonialsSeedApplyConfirmation(confirm: string | undefined) {
  if (confirm !== AUTHOR_TESTIMONIALS_SEED_CONFIRMATION) {
    throw new Error(
      `Apply protegido. Usa --apply --confirm ${AUTHOR_TESTIMONIALS_SEED_CONFIRMATION}.`,
    );
  }
}
