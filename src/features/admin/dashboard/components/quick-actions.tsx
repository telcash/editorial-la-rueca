import Link from 'next/link';
import { Archive, BookPlus, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const quickActions = [
  {
    label: 'Nuevo libro',
    href: '/admin/books/new',
    icon: BookPlus,
    variant: 'default',
  },
  {
    label: 'Nuevo autor',
    href: '/admin/authors/new',
    icon: UserPlus,
    variant: 'outline',
  },
  {
    label: 'Ver libros archivados',
    href: '/admin/books?status=archived',
    icon: Archive,
    variant: 'outline',
  },
  {
    label: 'Ver autores archivados',
    href: '/admin/authors?status=archived',
    icon: Archive,
    variant: 'outline',
  },
] as const;

export function QuickActions() {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="border-b border-border">
        <CardTitle>Acciones rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <Button key={action.href} asChild variant={action.variant}>
                <Link href={action.href}>
                  <Icon className="size-4" aria-hidden="true" />
                  {action.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
