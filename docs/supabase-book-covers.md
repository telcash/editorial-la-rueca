# Portadas de libros en Supabase Storage

## Bucket

- Nombre: `book-covers`.
- Visibilidad recomendada: publico.
- Uso: portadas editoriales visibles en catalogo, fichas publicas y panel administrativo.

El bucket no se crea desde la aplicacion. Debe crearse en Supabase Dashboard o mediante SQL/manual tooling autorizado.

## Configuracion

- MIME permitidos:
  - `image/jpeg`
  - `image/png`
  - `image/webp`
- Tamano maximo admitido por la aplicacion: 5 MB.
- Path de objetos:

```text
{bookId}/{uuid}.{extension}
```

Ejemplo:

```text
550e8400-e29b-41d4-a716-446655440000/9e56152b-83d2-494d-b6c9-5a36bf11be69.jpg
```

La aplicacion no conserva el nombre original del archivo y normaliza `image/jpeg` a `.jpg`.

## Variables de entorno

Se reutiliza la configuracion SSR existente de Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

No se usa `SUPABASE_SERVICE_ROLE_KEY` en cliente.

## Politicas recomendadas

El bucket es publico para lectura. La escritura debe quedar limitada a usuarios autenticados con rol editorial. Si ya existe una funcion segura `public.is_editorial_staff()`, las policies pueden basarse en ella para evitar depender directamente de consultas sujetas a RLS sobre `profiles`.

```sql
create policy "book covers insert for editorial staff"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'book-covers'
  and public.is_editorial_staff()
);

create policy "book covers update for editorial staff"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'book-covers'
  and public.is_editorial_staff()
)
with check (
  bucket_id = 'book-covers'
  and public.is_editorial_staff()
);

create policy "book covers delete for editorial staff"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'book-covers'
  and public.is_editorial_staff()
);
```

Al ser publico, Supabase permite servir los objetos publicos del bucket mediante URL publica. No es necesario crear una policy `select` adicional si el bucket esta configurado como publico.

## Estrategia de reemplazo

La prioridad es no dejar una referencia rota en PostgreSQL:

1. Se sube la nueva portada.
2. Se guarda la nueva URL en `public.books.cover_url`.
3. Se intenta eliminar la portada anterior.

Si falla la eliminacion de la portada anterior, la base de datos permanece consistente y puede quedar un archivo huerfano en Storage. Ese caso es preferible a eliminar una portada que aun sea la activa en la base de datos.

## Estrategia de eliminacion

1. Se actualiza `public.books.cover_url` a `null`.
2. Se intenta eliminar el archivo anterior.

Si falla la eliminacion del archivo, la base de datos ya no apunta a una URL invalida. El archivo huerfano puede limpiarse despues.

## Creacion con portada

El path requiere `bookId`, por lo que la aplicacion:

1. valida el formulario;
2. crea el libro con `BookService.createBook()`;
3. sube la portada con el `book.id`;
4. actualiza `coverUrl` mediante `BookService.updateBook(book.id, { coverUrl })`;
5. redirige al listado.

Si la portada falla despues de crear el libro, no se elimina automaticamente el libro. El usuario recibe un mensaje controlado y puede anadir la portada desde la edicion.

## Verificacion

1. Crear el bucket publico `book-covers`.
2. Aplicar las policies de escritura para staff editorial.
3. Iniciar sesion como `admin` o `editor`.
4. Crear un libro sin portada.
5. Crear un libro con portada JPG, PNG o WebP menor o igual a 5 MB.
6. Editar un libro y reemplazar la portada.
7. Editar un libro y eliminar la portada.
