import {
  Archive,
  BookImage,
  BookOpenText,
  CheckCircle2,
  FileText,
  ImageOff,
  UsersRound,
} from 'lucide-react';

import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { AdminFeedbackBanner } from '@/features/admin/components/feedback/admin-feedback-banner';
import { DashboardMetricCard } from '@/features/admin/dashboard/components/dashboard-metric-card';
import { QuickActions } from '@/features/admin/dashboard/components/quick-actions';
import { RecentAuthors } from '@/features/admin/dashboard/components/recent-authors';
import { RecentBooks } from '@/features/admin/dashboard/components/recent-books';
import { requireEditorialStaff } from '@/services/auth/access.service';
import * as DashboardService from '@/services/dashboard/dashboard.service';
import { getAdminFeedbackMessage } from '@/features/admin/lib/feedback-messages';

interface AdminPageProps {
  searchParams: Promise<{
    feedback?: string;
  }>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { feedback } = await searchParams;
  const feedbackMessage = getAdminFeedbackMessage(feedback);

  await requireEditorialStaff();

  const dashboard = await DashboardService.getDashboardData();

  return (
    <section className="space-y-8">
      {feedbackMessage ? <AdminFeedbackBanner tone="success" message={feedbackMessage} /> : null}

      <AdminPageHeader title="Dashboard" description="Resumen general del catálogo editorial." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          label="Autores activos"
          value={dashboard.metrics.authorsActive}
          icon={UsersRound}
          href="/admin/authors"
          description="Autores no archivados"
        />
        <DashboardMetricCard
          label="Autores archivados"
          value={dashboard.metrics.authorsArchived}
          icon={Archive}
          href="/admin/authors?status=archived"
          description="Fuera del catálogo activo"
        />
        <DashboardMetricCard
          label="Sin fotografía"
          value={dashboard.metrics.authorsWithoutPhoto}
          icon={ImageOff}
          href="/admin/authors"
          description="Autores activos sin foto"
        />
        <DashboardMetricCard
          label="Libros activos"
          value={dashboard.metrics.booksActive}
          icon={BookOpenText}
          href="/admin/books"
          description="Libros no archivados"
        />
        <DashboardMetricCard
          label="Publicados"
          value={dashboard.metrics.booksPublished}
          icon={CheckCircle2}
          href="/admin/books"
          description="Activos y visibles"
        />
        <DashboardMetricCard
          label="Borradores"
          value={dashboard.metrics.booksDraft}
          icon={FileText}
          href="/admin/books"
          description="Activos sin publicar"
        />
        <DashboardMetricCard
          label="Sin portada"
          value={dashboard.metrics.booksWithoutCover}
          icon={BookImage}
          href="/admin/books"
          description="Libros activos sin portada"
        />
        <DashboardMetricCard
          label="Libros archivados"
          value={dashboard.metrics.booksArchived}
          icon={Archive}
          href="/admin/books?status=archived"
          description="Fuera del catálogo activo"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <RecentBooks books={dashboard.recentBooks} />
        <RecentAuthors authors={dashboard.recentAuthors} />
      </div>

      <QuickActions />
    </section>
  );
}
