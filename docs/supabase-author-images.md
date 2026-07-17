# Imágenes de autores en Supabase Storage

Esta guía describe la infraestructura prevista para almacenar imágenes editoriales de autores.

## Bucket

Usar un bucket de Supabase Storage llamado `authors`.

Decisión recomendada: bucket público. Las imágenes de autores son contenido editorial público y se usarán en páginas públicas del catálogo. La escritura debe quedar limitada al servidor y a usuarios autenticados con rol editorial.

## Creación del bucket

Crear el bucket desde Supabase Dashboard:

1. Ir a Storage.
2. Crear bucket `authors`.
3. Marcarlo como público.
4. Configurar límite de subida compatible con 5 MB o superior.

También puede crearse por SQL o CLI de Supabase, pero este repositorio no incluye migración de Storage en este bloque.

## Variables de entorno

Se reutilizan las variables existentes del cliente SSR:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

No usar `SUPABASE_SERVICE_ROLE_KEY` en cliente. Las operaciones de escritura deben ejecutarse en servidor y depender de la sesión autenticada y de las políticas de Storage.

## Estructura de paths

Cada objeto debe guardarse con esta forma:

```text
{authorId}/{uuid}.{extension}
```

Ejemplo:

```text
550e8400-e29b-41d4-a716-446655440000/1d2e4f8a-2a8a-42b9-8d1f-9c8a1f4c7b61.jpg
```

No se usa nombre ni slug del autor para carpetas o archivos. El nombre original del archivo no se conserva.

Extensiones permitidas:

- `jpg` para `image/jpeg`
- `png` para `image/png`
- `webp` para `image/webp`

## Límites

El servicio acepta solo:

- `image/jpeg`
- `image/png`
- `image/webp`

Tamaño máximo: 5 MB.

Se rechazan archivos vacíos, MIME types no permitidos, author ids inválidos y paths que no cumplan el patrón esperado.

## Políticas recomendadas

Para un bucket público:

- Lectura pública de objetos en `authors`.
- Escritura solo para usuarios autenticados autorizados por el servidor.
- No permitir que clientes anónimos inserten, actualicen o eliminen objetos.

La capa de aplicación llama a `requireEditorialStaff()` antes de usar Storage. Aun así, las políticas de Storage deben proteger el bucket porque son la última barrera.

Ejemplo orientativo de políticas:

- `SELECT`: lectura pública para el bucket `authors`.
- `INSERT`: usuarios autenticados permitidos solo si la aplicación ya autorizó rol editorial.
- `DELETE`: usuarios autenticados permitidos solo si la aplicación ya autorizó rol editorial.

Supabase Storage no conoce por sí solo `public.profiles.role` salvo que la política lo consulte explícitamente. Si se desea reforzar a nivel SQL, la política debe verificar `auth.uid()` contra `public.profiles`.

## Reemplazo

El reemplazo sigue este orden:

1. Subir la nueva imagen.
2. Confirmar que la subida fue correcta.
3. Eliminar la imagen anterior después.
4. Si falla la eliminación anterior, se conserva la nueva imagen y se devuelve el resultado nuevo con `previousImageDeleted: false`.

Esta decisión evita borrar una imagen recién subida por un fallo parcial al limpiar la anterior. La limpieza de objetos antiguos puede reintentarse de forma operativa.

## Pruebas locales

La capa core del servicio se prueba con Supabase Storage mockeado. No requiere red real ni bucket existente.

Las pruebas cubren validación de MIME, tamaño, archivo vacío, generación de path, paths inseguros, subida, eliminación y reemplazo.
