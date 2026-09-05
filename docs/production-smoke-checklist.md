# Checklist de smoke post-deploy

Checklist operativa para Preview o Production. El smoke automático es
read-only: no inicia sesión, no crea leads, no envía emails y no escribe en
PostgreSQL, Supabase, Storage ni Upstash.

## A. Pre-deploy gate

Ejecutar en la rama que se va a desplegar:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:run
npm run build
```

Todos deben terminar correctamente antes del deploy.

## B. Smoke HTTP automatizado

Ejecutar con una URL explícita de Preview o Production:

```bash
npm run smoke:production -- --base-url=https://preview.example.com
```

Comprueba `200` y una respuesta HTML básica para `/`, `/libros` y `/autores`;
`200` y formato reconocible para `/robots.txt` y `/sitemap.xml`; y `404` para
`/__production-smoke-not-found`. Cada request tiene timeout y no se hacen
reintentos.

No se debe poner un dominio fijo en el script ni incluir credenciales en la
URL.

## C. Smoke manual post-deploy

Duración objetivo: 5–10 minutos.

1. **Home:** abrir `/` y verificar que carga, muestra el header y la navegación.
   Bloquea el release si no carga.
2. **Catálogo:** abrir `/libros`, abrir un libro publicado y comprobar detalle,
   portada o fallback, autor y CTA Comprar. Bloquea si falla.
3. **Compra:** abrir Tienda y comprobar varios mercados Quares. En un libro con
   configuración comercial, revisar Quares y Amazon si existe. No hacer
   requests automáticos a esos proveedores.
4. **Admin:** abrir `/login`, iniciar sesión manualmente con una cuenta editorial
   autorizada y abrir `/admin/contact-requests`. No guardar credenciales en el
   repositorio.
5. **Formulario:** preferir Preview. Si el flujo fue afectado, crear un lead
   identificable como `QA smoke YYYY-MM-DD`, verificar CRM y email interno y
   reconocerlo posteriormente según el procedimiento operativo del equipo. No
   hacerlo rutinariamente en Production.
6. **UTM:** usar una URL con
   `utm_source=qa&utm_medium=smoke&utm_campaign=deploy_test`, aceptar Analytics,
   navegar entre páginas y volver al formulario. Después revocar Analytics y
   comprobar que se elimina la persistencia. El UTM directo de Home no depende
   de persistencia cross-page.
7. **Cookies:** comprobar banner, aceptar, rechazar, configurar y revocar.
8. **SEO:** revisar manualmente metadata adicional solo cuando el deploy incluya
   cambios SEO; robots, sitemap y 404 ya forman parte del smoke HTTP.

## D. No automatizar todavía

- login o Supabase Auth;
- formulario, SMTP o creación de leads;
- Upstash rate limit real;
- cookies y `sessionStorage`;
- UTM browser;
- requests a Quares o Amazon;
- rutas admin y operaciones CRUD;
- cualquier escritura en datos de producción.

## Condiciones de release

### Bloquean

- Home, catálogo o detalle crítico roto;
- 404 que responde 500;
- robots o sitemap con error;
- login o backoffice inaccesible;
- formulario afectado que no puede crear leads;
- href de compra generado por la aplicación claramente incorrecto.

### No bloquean inicialmente

- diferencias visuales menores;
- proveedor Quares/Amazon temporalmente caído;
- un mercado aislado ausente si el header degrada correctamente;
- metadata menor no crítica;
- pequeños problemas responsive que no impidan navegación o captación.
