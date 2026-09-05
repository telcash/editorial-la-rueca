import type { Metadata } from 'next';

import { PublicContainer } from '@/components/public/public-container';
import { PublicPageHeader } from '@/components/public/public-page-header';
import { PublicSection } from '@/components/public/public-section';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Política de cookies | Editorial La Rueca',
  description: 'Información sobre el uso de cookies y tecnologías similares en Editorial La Rueca.',
  alternates: { canonical: '/politica-de-cookies' },
};

export default function CookiePolicyPage() {
  return (
    <PublicSection variant="compact">
      <PublicContainer size="reading">
        <PublicPageHeader
          title="Política de cookies"
          description="Información sobre las tecnologías necesarias y las preferencias opcionales del sitio."
        />

        <article className="space-y-8 text-public-body leading-relaxed text-public-ink">
          <PolicySection title="1. Responsable">
            <p>
              La responsable de este sitio web y del tratamiento relacionado con las tecnologías
              descritas en esta política es {siteConfig.legalData.owner}, que desarrolla su
              actividad bajo el nombre comercial {siteConfig.legalData.companyName}.
            </p>

            <dl className="mt-4 space-y-2">
              <div>
                <dt className="inline font-semibold text-public-ink">DNI/NIF: </dt>
                <dd className="inline">{siteConfig.legalData.nif}</dd>
              </div>

              <div>
                <dt className="inline font-semibold text-public-ink">Domicilio: </dt>
                <dd className="inline">{siteConfig.legalData.address}</dd>
              </div>

              <div>
                <dt className="inline font-semibold text-public-ink">Correo electrónico: </dt>
                <dd className="inline">
                  <a
                    href={`mailto:${siteConfig.legalData.email}`}
                    className="font-semibold text-public-red underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red"
                  >
                    {siteConfig.legalData.email}
                  </a>
                </dd>
              </div>
            </dl>
          </PolicySection>

          <PolicySection title="2. Qué son las cookies">
            <p>
              Las cookies y tecnologías similares son pequeños archivos, identificadores o
              mecanismos que un sitio web puede almacenar o consultar en el dispositivo de una
              persona usuaria.
            </p>

            <p className="mt-3">
              Pueden utilizarse, entre otras finalidades, para permitir funciones técnicas, recordar
              preferencias o, cuando exista consentimiento, realizar determinadas mediciones o
              actividades de marketing.
            </p>
          </PolicySection>

          <PolicySection title="3. Cookies estrictamente necesarias">
            <p>
              {siteConfig.legalData.companyName} utiliza las tecnologías necesarias para permitir el
              funcionamiento técnico y seguro del sitio.
            </p>

            <p className="mt-3">
              Entre ellas puede incluirse la gestión técnica de sesión de Supabase cuando una
              persona accede a zonas que requieren autenticación, así como el almacenamiento
              necesario para recordar las preferencias de consentimiento de cookies.
            </p>

            <p className="mt-3">
              Estas tecnologías no se pueden desactivar desde el gestor de preferencias cuando sean
              imprescindibles para prestar la función solicitada o mantener el funcionamiento básico
              del sitio.
            </p>
          </PolicySection>

          <PolicySection title="4. Cookies de analítica">
            <p>
              Cuando la persona usuaria acepta la categoría Analytics, la web puede utilizar
              temporalmente el almacenamiento de sesión del navegador para conservar parámetros de
              procedencia y campaña durante la navegación.
            </p>

            <p className="mt-3">
              Esta información se utiliza para medir la atribución de las solicitudes recibidas y de
              las campañas que las originan. Se elimina al revocar Analytics y, normalmente, el
              almacenamiento de sesión se limita a la sesión y a la pestaña del navegador.
            </p>

            <p className="mt-3">
              Este almacenamiento de sesión no es una cookie. No se incorporan con esta finalidad
              GA4, GTM, Meta Pixel ni otros sistemas externos de seguimiento.
            </p>
          </PolicySection>

          <PolicySection title="5. Cookies de marketing">
            <p>
              Actualmente no hay herramientas de marketing, píxeles publicitarios ni sistemas
              equivalentes instalados en esta web.
            </p>

            <p className="mt-3">
              La categoría de marketing se encuentra preparada para futuras tecnologías y permanece
              desactivada mientras no exista consentimiento expreso de la persona usuaria.
            </p>
          </PolicySection>

          <PolicySection title="6. Cookies propias y de terceros">
            <p>
              La web puede utilizar tecnologías propias y servicios técnicos prestados por terceros
              cuando sean necesarios para su funcionamiento.
            </p>

            <p className="mt-3">
              Actualmente no se identifican cookies opcionales concretas de marketing que deban
              incluirse en un inventario adicional. La atribución Analytics descrita anteriormente
              utiliza almacenamiento de sesión, no una cookie.
            </p>

            <p className="mt-3">
              Si se incorporan nuevas tecnologías que utilicen cookies o identificadores opcionales,
              esta política se actualizará para informar sobre su proveedor, finalidad y, cuando
              corresponda, duración.
            </p>
          </PolicySection>

          <PolicySection title="7. Consentimiento">
            <p>En la primera visita, las categorías opcionales permanecen desactivadas.</p>

            <p className="mt-3">
              La persona usuaria puede aceptar todas las categorías opcionales, rechazarlas o
              configurar individualmente sus preferencias desde el banner de cookies.
            </p>

            <p className="mt-3">
              La ausencia de una decisión no se interpreta como consentimiento para instalar
              tecnologías opcionales.
            </p>
          </PolicySection>

          <PolicySection title="8. Cómo modificar o retirar el consentimiento">
            <p>
              Puedes cambiar tu decisión en cualquier momento mediante la opción “Configurar
              cookies” disponible en el pie de página de editoriallarueca.com.
            </p>

            <p className="mt-3">
              Desde ese panel puedes mantener activadas o desactivar las categorías opcionales y
              guardar nuevamente tus preferencias.
            </p>
          </PolicySection>

          <PolicySection title="9. Gestión desde el navegador">
            <p>
              Los principales navegadores permiten consultar, bloquear o eliminar cookies desde sus
              opciones de privacidad o configuración.
            </p>

            <p className="mt-3">
              Si eliminas las cookies o datos almacenados por el sitio, también podrían eliminarse
              las preferencias que hayas guardado y es posible que determinadas funciones necesarias
              tengan que configurarse de nuevo.
            </p>
          </PolicySection>

          <PolicySection title="10. Sitios externos">
            <p>
              Algunos enlaces de {siteConfig.legalData.website} pueden dirigir a páginas externas,
              como Amazon o las tiendas Quares.
            </p>

            <p className="mt-3">
              Las cookies utilizadas por esos sitios externos no están controladas por esta Política
              de cookies. Una vez que accedas a ellos, deberás consultar sus respectivas políticas
              de privacidad y cookies.
            </p>
          </PolicySection>

          <PolicySection title="11. Cambios en esta política">
            <p>
              {siteConfig.legalData.companyName} podrá actualizar esta Política de cookies cuando
              cambien las tecnologías utilizadas, sus finalidades o los requisitos aplicables.
            </p>

            <p className="mt-3">
              Si se producen cambios sustanciales en las categorías o finalidades que requieran una
              nueva decisión, el sitio podrá solicitar nuevamente las preferencias de
              consentimiento.
            </p>
          </PolicySection>

          <PolicySection title="12. Más información">
            <p>
              Para conocer cómo {siteConfig.legalData.companyName} trata los datos personales,
              puedes consultar la{' '}
              <a
                href="/politica-de-privacidad"
                className="font-semibold text-public-red underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red"
              >
                Política de privacidad
              </a>
              .
            </p>

            <p className="mt-3">
              También puedes consultar el{' '}
              <a
                href="/aviso-legal"
                className="font-semibold text-public-red underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red"
              >
                Aviso legal
              </a>{' '}
              para obtener información identificativa y general sobre este sitio.
            </p>
          </PolicySection>

          <p className="text-sm text-public-muted">
            Última actualización: 3 de septiembre de 2026.
          </p>
        </article>
      </PublicContainer>
    </PublicSection>
  );
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif-public text-2xl font-semibold text-public-ink">{title}</h2>
      <div className="mt-3 text-public-muted">{children}</div>
    </section>
  );
}
