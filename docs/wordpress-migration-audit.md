# Auditoría read-only del export WordPress

Este sprint genera un informe reproducible del WXR de Editorial La Rueca. Es una herramienta de análisis: no importa datos, no conecta con Supabase, no escribe en PostgreSQL y no sube archivos a Storage.

## Ejecución

Coloca el XML dentro del proyecto o pasa una ruta relativa/absoluta al comando:

```bash
npm run migration:audit -- --input ./migration/editoriallarueca.WordPress.2026-07-15.xml
```

Por defecto escribe en `./migration/audit`. Para elegir otra carpeta:

```bash
npm run migration:audit -- --input ./migration/editoriallarueca.WordPress.2026-07-15.xml --output ./migration/audit
```

La herramienta no sobrescribe archivos existentes de auditoría salvo que se use `--force`.

## Outputs

- `migration-report.json`: resumen general, conteos, taxonomías, ACF, WooCommerce y estadísticas.
- `model-gap-analysis.json`: comparación entre campos WordPress y el modelo actual.
- `pilot-sample.json`: muestra de casos diversos para diseñar una migración piloto.
- `post-types.csv`: conteo por `post_type`.
- `authors-candidates.csv`: candidatos de autores y clasificación.
- `books-candidates.csv`: candidatos de libros legacy derivados de `tf_libro`.
- `relationships-candidates.csv`: relaciones inferidas entre autores y libros.
- `attachments-candidates.csv`: inventario de attachments.
- `issues.csv`: problemas y riesgos de calidad de datos.

## Clasificaciones

- `legacy_author_book_combined`: registro `autor` que contiene `tf_libro`; probablemente mezcla autor y libro en el mismo CPT histórico.
- `author_only_candidate`: registro `autor` sin `tf_libro` y con señales suficientes de autor moderno.
- `ambiguous`: registro que no permite clasificar con seguridad.

`ta_resena` se conserva como HTML original. La auditoría añade una clasificación heurística (`book_synopsis`, `author_bio` o `ambiguous`) y un `plainTextPreview`, pero no transforma ni sustituye el contenido original.

## Limitaciones

WXR no es un backup completo de WordPress. Puede no incluir archivos físicos, configuración completa de plugins, datos serializados interpretables en todos los casos, redirecciones históricas o relaciones que solo existan en código/plugin.

Las definiciones ACF detectadas para `libro` no implican que existan registros reales `post_type=libro`. El informe marca explícitamente `NO_ACTUAL_BOOK_POSTS_FOUND` cuando no hay datos de ese CPT.

## Uso seguro

No debe usarse este output para importar automáticamente. Sirve para diseñar la migración piloto, revisar duplicados, resolver ambigüedad de imágenes, decidir mapeos de campos y preparar un plan de redirecciones.
