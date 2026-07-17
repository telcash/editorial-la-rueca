# AGENTS.md

## Reglas permanentes del repositorio

Estas reglas aplican a todo el trabajo de desarrollo en Editorial La Rueca.

## Stack

- Next.js 16.
- React 19.
- TypeScript.
- Tailwind CSS 4.
- Supabase.
- Drizzle ORM.
- PostgreSQL.

## TypeScript y calidad de codigo

- Mantener TypeScript en modo estricto.
- No usar `any` salvo justificacion expresa.
- No crear funciones, imports ni archivos ficticios.
- No utilizar una funcion antes de implementarla.
- Entregar archivos completos y coherentes.
- Mantener nombres de archivos y codigo en ingles.
- Mantener documentacion y contenido editorial en espanol.

## Arquitectura

- Seguir la arquitectura: UI -> feature -> service -> repository -> Drizzle -> PostgreSQL.
- No consultar la base de datos directamente desde componentes.
- Supabase JS se usara para Auth y Storage.
- No exponer `SUPABASE_SERVICE_ROLE_KEY` al cliente.
- Preferir Server Components.
- Usar Client Components solo cuando exista interaccion real del navegador.
- Validar entradas con Zod cuando se incorporen formularios o datos externos.

## Operativa

- Ejecutar `npm run lint`, `npm run typecheck` y `npm run format:check` antes de finalizar una tarea.
- No ejecutar migraciones destructivas sin autorizacion.
- No hacer commits salvo que se solicite expresamente.
- No modificar archivos fuera del alcance indicado en cada tarea.
