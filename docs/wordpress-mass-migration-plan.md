# Plan de migracion masiva WordPress

Este documento describe el dry-run masivo del catalogo legacy de WordPress. No importa datos, no sube imagenes y no conecta con Supabase.

## Ejecucion

```bash
npm run migration:mass-plan -- --audit ./migration/audit
```

Outputs principales:

- `migration/mass/mass-plan.json`
- `migration/mass/mass-authors.json`
- `migration/mass/mass-books.json`
- `migration/mass/mass-relations.json`
- `migration/mass/mass-editions.json`
- `migration/mass/mass-author-images.json`
- `migration/mass/mass-book-covers.json`
- `migration/mass/mass-conflicts.json`
- `migration/mass/mass-manual-review.json`
- `migration/mass/mass-summary.json`
- `migration/mass/mass-decisions-template.json`
- `migration/mass/redirect-candidates.json`

## Reglas confirmadas por el piloto

- `_thumbnail_id` legacy suele ser foto de autor.
- `_thumbnail_id` no debe usarse como portada por defecto.
- `imagen_destacada_2` tiene uso mixto.
- Solo portadas `high confidence` pueden quedar como candidatas automaticas.
- Autores y libros entran como borradores: `isPublished = false`, `isFeatured = false`, `isArchived = false`.
- El futuro apply debe ser incremental, con manifest y checkpoints.
- La idempotencia es obligatoria antes de cualquier escritura real.

## Estrategia futura por lotes

La ejecucion real deberia hacerse en lotes pequenos, por ejemplo 20 autores/libros por batch:

1. Preflight del batch.
2. Apply del batch.
3. Persistencia de checkpoint.
4. Verificacion en DB.
5. Verificacion de imagenes en Storage.
6. Registro de incidencias y rollback manual documentado si hiciera falta.

No se implementa apply masivo en este sprint.

## Limitaciones

- El WXR no es un backup completo de WordPress.
- Los CSV actuales no incluyen tamano real de archivo para todos los attachments; las imagenes mayores de 5 MB solo pueden detectarse cuando exista metadata de tamano.
- Los redirects de libros legacy no se inventan si no existe URL dedicada.
- Los campos no modelados se conservan en `sourceMetadata` para revision posterior.
