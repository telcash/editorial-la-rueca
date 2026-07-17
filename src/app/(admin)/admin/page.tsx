import { ArrowRight, BookOpenText, FolderTree, UsersRound } from 'lucide-react';

import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const moduleCards = [
  {
    title: 'Autores',
    description: 'Gestionar autores',
    status: 'Próximo módulo',
    icon: UsersRound,
  },
  {
    title: 'Libros',
    description: 'Gestionar catálogo',
    status: 'Próximamente',
    icon: BookOpenText,
  },
  {
    title: 'Categorías',
    description: 'Organizar categorías',
    status: 'Próximamente',
    icon: FolderTree,
  },
];

export default function AdminPage() {
  return (
    <section className="space-y-8">
      <AdminPageHeader
        title="Panel editorial"
        description="Gestiona los contenidos y la presencia digital de Editorial La Rueca."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {moduleCards.map((module) => {
          const Icon = module.icon;

          return (
            <Card key={module.title} className="border-border bg-card">
              <CardHeader>
                <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-accent text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <CardTitle>{module.title}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Badge variant="outline">{module.status}</Badge>
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
