# Sprint 12B: migración piloto WordPress

Este sprint prepara una migración piloto controlada desde los outputs de auditoría de WordPress. Es una herramienta de verificación y aplicación limitada: no sustituye una migración masiva.

## Principios

- El modo por defecto es `dry-run`.
- El `dry-run` no conecta a Supabase, no importa Drizzle, no escribe en PostgreSQL y no sube archivos a Storage.
- El XML WXR no se parsea como fuente primaria en este sprint.
- La fuente son los archivos generados por `migration:audit`.
- Solo se procesan los `candidateKey` presentes en `pilot-sample.json` y las relaciones necesarias para esos candidatos.

## Ejecución

```bash
npm run migration:pilot -- --audit ./migration/audit --dry-run
```

El directorio de salida por defecto es:

```text
migration/pilot
```

Cada ejecución regenera y sobrescribe los archivos de salida dentro del directorio indicado. Revisa o mueve outputs anteriores si necesitas conservar una comparación histórica.

También se puede indicar otro directorio:

```bash
npm run migration:pilot -- --audit ./migration/audit --output ./migration/pilot
```

## Outputs

El `dry-run` genera:

- `plan.json`
- `authors.json`
- `books.json`
- `relations.json`
- `editions.json`
- `images.json`
- `issues.json`
- `manifest.json`
- `rollback-plan.json`
- `result.json`

## Decisiones manuales

Los duplicados de libros bloquean el `apply` si no existe una decisión explícita.

Archivo esperado:

```text
migration/pilot/decisions.json
```

Ejemplo:

```json
{
  "bookDuplicateGroups": {
    "group-x": {
      "action": "merge",
      "canonicalCandidateKey": "book:example",
      "mergeAuthorRelations": true
    }
  }
}
```

Los duplicados potenciales de autores se conservan separados por defecto salvo conflicto real de slug.

## Apply

La aplicación real está protegida por confirmación explícita:

```bash
npm run migration:pilot -- --audit ./migration/audit --apply --confirm PILOT
```

No ejecutar `--apply` sin revisar antes:

- `plan.json`
- `issues.json`
- `manifest.json`
- `rollback-plan.json`

## Manifest

`manifest.json` mantiene el vínculo entre origen WordPress y entidad destino:

- `sourceType`
- `sourceWpPostId`
- `candidateKey`
- `targetEntityType`
- `targetId`
- `status`
- `warnings`
- `sourceMetadata`
- `imageStatus`
- `inferredEdition`

El manifest es externo al dominio. No se persiste en las tablas editoriales.

## Rollback

`rollback-plan.json` lista los IDs y archivos creados por el piloto cuando se ejecute en modo `apply`. La reversión es manual y debe revisarse antes de borrar datos o archivos.

## Reglas de importación piloto

- Autores se crean como no publicados, no destacados y no archivados.
- Libros se crean como no publicados, no destacados y no archivados.
- Categorías no se migran en este piloto.
- SEO no se persiste automáticamente.
- Videos y campos no modelados se conservan en `sourceMetadata`.
- Los libros legacy reciben una edición mínima inferida con `format=paperback` y `editionLabel=Datos pendientes de revisión`.

## Imágenes

Solo se planifican imágenes seguras:

- foto de autor segura;
- portada de libro segura.

Las imágenes ambiguas se omiten y se registran como revisión manual. En `apply`, las imágenes se descargan desde la URL original, se validan por MIME y tamaño, y se suben mediante los servicios existentes de Storage.

El CLI no usa el cliente SSR de Supabase ni depende de `cookies()` o `redirect()`. Para Storage usa un cliente de migración server-side con:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

La `SUPABASE_SERVICE_ROLE_KEY` bypassa RLS y policies de Supabase, por lo que solo debe configurarse en entornos server/CLI controlados. Nunca debe exponerse en el navegador ni declararse con prefijo `NEXT_PUBLIC_`.

El backoffice web conserva el flujo normal con usuario autenticado y `requireEditorialStaff()`. La migración CLI escribe únicamente en los buckets previstos para este piloto:

- `authors`
- `book-covers`

Las imágenes `ambiguous` siguen quedando `skipped`; la service role no cambia esa regla.

## Riesgos

- WXR no es un backup completo de WordPress.
- Algunos campos ACF pueden ser definiciones sin datos reales.
- `ta_resena` tiene usos históricos distintos.
- Las imágenes antiguas pueden no representar siempre la entidad correcta.
- WooCommerce no contiene necesariamente el catálogo editorial completo.
