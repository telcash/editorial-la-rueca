import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AuthorTestimonialsTable } from '@/features/admin/author-testimonials/components/author-testimonials-table';
import { EmptyAuthorTestimonialsState } from '@/features/admin/author-testimonials/components/empty-author-testimonials-state';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { AdminFeedbackBanner } from '@/features/admin/components/feedback/admin-feedback-banner';
import { getAdminFeedbackMessage } from '@/features/admin/lib/feedback-messages';
import { requireEditorialStaff } from '@/services/auth/access.service';
import * as AuthorTestimonialService from '@/services/author-testimonials/author-testimonial.service';

interface AdminTestimonialsPageProps {
  searchParams: Promise<{
    feedback?: string;
  }>;
}

export default async function AdminTestimonialsPage({ searchParams }: AdminTestimonialsPageProps) {
  const params = await searchParams;
  const feedbackMessage = getAdminFeedbackMessage(params.feedback);
  const staff = await requireEditorialStaff();
  const testimonials = await AuthorTestimonialService.listTestimonials();

  return (
    <section className="space-y-6">
      {feedbackMessage ? <AdminFeedbackBanner tone="success" message={feedbackMessage} /> : null}

      <AdminPageHeader
        title="Testimonios"
        description="Gestiona testimonios de autores para futuras secciones públicas de confianza editorial."
        actions={
          <Button asChild>
            <Link href="/admin/testimonials/new">
              <Plus className="size-4" aria-hidden="true" />
              Nuevo testimonio
            </Link>
          </Button>
        }
      />

      {testimonials.length > 0 ? (
        <AuthorTestimonialsTable
          testimonials={testimonials}
          canDeletePermanently={staff.role === 'admin'}
        />
      ) : (
        <EmptyAuthorTestimonialsState />
      )}
    </section>
  );
}
