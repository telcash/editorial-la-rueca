import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function AuthorNotFoundPage() {
  return (
    <Card>
      <CardContent className="px-6 py-12 text-center">
        <h1 className="text-xl font-semibold text-foreground">Autor no encontrado</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          El autor solicitado no existe o ya no está disponible.
        </p>
        <Button asChild className="mt-6">
          <Link href="/admin/authors">Volver a autores</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
