# Migracion masiva WordPress

Este documento describe el motor de migracion masiva controlada del catalogo WordPress.

## Estado

El motor esta preparado para planificar, previsualizar y hacer preflight. El apply real no debe
ejecutarse sin backup, revision final y autorizacion explicita.

## Comandos

Dry-run read-only:

```bash
npm run migration:mass -- --mass ./migration/mass --dry-run
```

Preflight read-only:

```bash
npm run migration:mass -- --mass ./migration/mass --preflight
```

Apply futuro protegido:

```bash
npm run migration:mass -- \
  --mass ./migration/mass \
  --apply \
  --confirm MASS_MIGRATION \
  --confirm-backup
```

## Arquitectura

El motor lee los outputs de `migration/mass` y genera una variante preserve en
`migration/mass/apply`.

No fusiona autores duplicados. Los registros legacy se preservan como autores separados y se
marcan externamente para una futura herramienta de fusion.

## Reconciliacion con piloto

El motor lee `migration/pilot/manifest.json`. Si encuentra un mapping aplicado o parcial para un
`candidateKey`, lo marca como `preexisting=true` y lo reutiliza en el manifest masivo. Estos recursos
no entran en rollback destructivo del mass migration.

## Batches y resume

El dry-run divide entidades en lotes con `--batch-size`, por defecto `20`. El manifest incremental
esta preparado para checkpoints por entidad:

- `author_created`
- `book_created`
- `edition_created`
- `relation_created`
- `author_image_uploaded`
- `book_cover_uploaded`
- `complete`

El modo futuro `--resume` debera continuar desde `manifest.json` sin duplicar entidades.

## Rollback

`rollback-plan.json` contiene solo recursos atribuibles al motor masivo. Los recursos reconciliados
desde el piloto se marcan `preexisting=true` y no deben borrarse por rollback del mass migration.

## Politica de duplicados

Los duplicate groups se preservan separados con:

`PRESERVE_SEPARATE_PENDING_DEDUPLICATION`

Si existe colision de slug dentro del plan, se aplica un slug legacy determinista basado en
`sourceWpPostId`, por ejemplo:

`juan-perez-wp-1234`

No se anaden sufijos silenciosos durante apply.

## Politica de imagenes

Fotos de autor:

- solo `AUTO_UPLOAD` pasa a `READY`;
- imagenes ambiguas quedan en `MANUAL_REVIEW`;
- sin imagen queda `NO_IMAGE`;
- limite funcional: 5 MB.

Portadas:

- solo `book-cover-best-match.json` con `confidence=high` pasa a `READY`;
- `medium` y `low` quedan fuera de subida automatica;
- no se usa `_thumbnail_id` como portada por defecto.

## Backup

El preflight mantiene el blocker:

`BACKUP_REQUIRED_BEFORE_APPLY`

No ejecutar apply sin backup verificado y revision final de outputs.
