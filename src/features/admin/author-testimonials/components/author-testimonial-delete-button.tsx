'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { PermanentDeleteDialog } from '@/features/admin/components/permanent-delete-dialog';
import { deleteAuthorTestimonialAction } from '../actions/delete-author-testimonial';

interface AuthorTestimonialDeleteButtonProps {
  testimonialId: string;
  authorName: string;
}

export function AuthorTestimonialDeleteButton({
  testimonialId,
  authorName,
}: AuthorTestimonialDeleteButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm(confirmation: string) {
    setMessage(null);

    startTransition(async () => {
      const result = await deleteAuthorTestimonialAction(testimonialId, confirmation);

      if (result.success) {
        setIsOpen(false);
        router.refresh();
        return;
      }

      setMessage(result.message);
    });
  }

  return (
    <>
      <Button type="button" variant="destructive" size="sm" onClick={() => setIsOpen(true)}>
        Eliminar
      </Button>
      <PermanentDeleteDialog
        open={isOpen}
        title="Eliminar testimonio"
        description="Esta acción eliminará definitivamente el testimonio seleccionado."
        entityLabel={authorName}
        pending={isPending}
        errorMessage={message}
        onConfirm={handleConfirm}
        onCancel={() => {
          if (!isPending) {
            setIsOpen(false);
            setMessage(null);
          }
        }}
      />
    </>
  );
}
