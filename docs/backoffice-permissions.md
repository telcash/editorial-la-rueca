# Permisos del Backoffice

Esta matriz define los permisos actuales del panel administrativo de Editorial La Rueca.

## Roles

- `admin`: acceso completo al panel.
- `editor`: gestión editorial del catálogo sin operaciones destructivas definitivas.

## Matriz actual

| Acción                                                | Admin     | Editor |
| ----------------------------------------------------- | --------- | ------ |
| Acceder a `/admin`                                    | Sí        | Sí     |
| Crear autores                                         | Sí        | Sí     |
| Editar autores                                        | Sí        | Sí     |
| Subir o reemplazar fotografías de autores             | Sí        | Sí     |
| Publicar/despublicar autores                          | Sí        | Sí     |
| Destacar autores                                      | Sí        | Sí     |
| Archivar/restaurar autores                            | Sí        | Sí     |
| Eliminar autores definitivamente                      | Sí        | No     |
| Crear libros                                          | Sí        | Sí     |
| Editar libros                                         | Sí        | Sí     |
| Subir, reemplazar o eliminar portadas de libros       | Sí        | Sí     |
| Publicar/despublicar libros                           | Sí        | Sí     |
| Destacar libros                                       | Sí        | Sí     |
| Gestionar autores, categorías y ediciones de un libro | Sí        | Sí     |
| Archivar/restaurar libros                             | Sí        | Sí     |
| Eliminar libros definitivamente                       | Sí        | No     |
| Crear categorías                                      | Sí        | Sí     |
| Editar categorías                                     | Sí        | Sí     |
| Publicar/despublicar categorías                       | Sí        | Sí     |
| Archivar/restaurar categorías                         | Sí        | Sí     |
| Eliminar categorías definitivamente                   | Sí        | No     |
| Cambiar la propia contraseña                          | Sí        | Sí     |
| Gestión de usuarios                                   | Pendiente | No     |
| Configuración sensible futura                         | Pendiente | No     |

## Aplicación server-side

- El layout `/admin` exige `requireEditorialStaff()`.
- Las acciones de creación, edición, subida de imágenes y archivado/restauración exigen `requireEditorialStaff()`.
- Las acciones de borrado definitivo exigen `requireAdmin()`.
- La UI puede ocultar botones, pero la autorización efectiva debe permanecer siempre en servidor.
