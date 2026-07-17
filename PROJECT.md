# Editorial La Rueca

Editorial La Rueca es la nueva plataforma web de la editorial. El proyecto busca relanzar su presencia digital con una base tecnica moderna, mantenible y preparada para gestionar catalogo, contenidos publicos, autenticacion y administracion interna.

## Objetivo del relanzamiento

El relanzamiento tiene como objetivo sustituir o complementar la presencia actual con una aplicacion propia basada en Next.js, conectada a Supabase y PostgreSQL, capaz de soportar el catalogo editorial, formularios, SEO, panel administrativo y una futura migracion desde WordPress.

## Stack actual

- Next.js 16.
- React 19.
- TypeScript.
- Tailwind CSS 4.
- Supabase.
- Drizzle ORM.
- PostgreSQL.
- ESLint.
- Prettier.
- npm.

## Arquitectura acordada

La arquitectura separa responsabilidades por capas:

```text
UI -> feature -> service -> repository -> Drizzle -> PostgreSQL
```

- La UI no consulta directamente la base de datos.
- Las features agrupan comportamiento funcional por dominio.
- Los services coordinan reglas de negocio y casos de uso.
- Los repositories encapsulan el acceso a datos.
- Drizzle ORM gestiona el acceso tipado a PostgreSQL.
- Supabase JS se reserva para Auth y Storage.

## Estado actual

- Next.js configurado.
- ESLint y Prettier configurados.
- Supabase pendiente de conexion completa.
- Drizzle instalado y configurado.
- Ninguna tabla creada todavia.

## Roadmap general

1. Infraestructura.
2. Base de datos.
3. Autenticacion.
4. Catalogo editorial.
5. Web publica.
6. Panel administrativo.
7. Formularios.
8. SEO.
9. Migracion desde WordPress.
10. Despliegue.
