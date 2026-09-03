import type { Metadata } from 'next';

import { PublicContainer } from '@/components/public/public-container';
import { PublicPageHeader } from '@/components/public/public-page-header';
import { PublicSection } from '@/components/public/public-section';

export const metadata: Metadata = {
  title: 'Aviso legal | Editorial La Rueca',
  description:
    'Información legal, condiciones de uso y datos identificativos de Editorial La Rueca.',
};

export default function LegalNoticePage() {
  return (
    <PublicSection variant="compact">
      <PublicContainer size="reading">
        <PublicPageHeader
          title="Aviso legal"
          description="Información general sobre Editorial La Rueca, el uso de este sitio web y sus contenidos."
        />

        <article className="space-y-8 text-public-body leading-relaxed text-public-ink">
          <LegalSection title="1. Titular del sitio web">
            <p>
              En cumplimiento de las obligaciones de información aplicables a los servicios
              prestados a través de Internet, se facilitan los siguientes datos identificativos del
              titular de este sitio web:
            </p>

            <dl className="mt-4 space-y-2">
              <div>
                <dt className="inline font-semibold text-public-ink">Nombre comercial: </dt>
                <dd className="inline">Editorial La Rueca</dd>
              </div>

              <div>
                <dt className="inline font-semibold text-public-ink">Titular: </dt>
                <dd className="inline">Almudena Jiménez Fernández</dd>
              </div>

              <div>
                <dt className="inline font-semibold text-public-ink">DNI/NIF: </dt>
                <dd className="inline">50308893G</dd>
              </div>

              <div>
                <dt className="inline font-semibold text-public-ink">Domicilio: </dt>
                <dd className="inline">C/ Duque de Sesto , 23 bajo C, 28006 Madrid</dd>
              </div>

              <div>
                <dt className="inline font-semibold text-public-ink">Teléfono: </dt>
                <dd className="inline">
                  <a
                    href="tel:+34639289535"
                    className="font-semibold text-public-red underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red"
                  >
                    639 289 535
                  </a>
                </dd>
              </div>

              <div>
                <dt className="inline font-semibold text-public-ink">Correo electrónico: </dt>
                <dd className="inline">
                  <a
                    href="mailto:ajimenez@editoriallarueca.com"
                    className="font-semibold text-public-red underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red"
                  >
                    ajimenez@editoriallarueca.com
                  </a>
                </dd>
              </div>

              <div>
                <dt className="inline font-semibold text-public-ink">Sitio web: </dt>
                <dd className="inline">editoriallarueca.com</dd>
              </div>
            </dl>
          </LegalSection>

          <LegalSection title="2. Objeto del sitio web">
            <p>
              Este sitio web tiene como finalidad ofrecer información sobre Editorial La Rueca, su
              catálogo, autores, publicaciones, actividades y servicios editoriales, así como
              facilitar el contacto de personas interesadas en recibir información o iniciar un
              proyecto editorial.
            </p>

            <p className="mt-3">
              El acceso al sitio web no implica por sí mismo el establecimiento de una relación
              contractual o comercial entre la persona usuaria y Editorial La Rueca.
            </p>
          </LegalSection>

          <LegalSection title="3. Condiciones de uso">
            <p>
              La persona usuaria se compromete a utilizar este sitio web, sus contenidos y sus
              servicios de conformidad con la legislación vigente, la buena fe, el orden público y
              estas condiciones de uso.
            </p>

            <p className="mt-3">
              No está permitido utilizar el sitio con fines ilícitos o lesivos, introducir o
              difundir programas maliciosos, intentar acceder a zonas restringidas sin autorización,
              alterar el funcionamiento normal del servicio o realizar actuaciones que puedan
              perjudicar a Editorial La Rueca, a sus autores o a terceros.
            </p>
          </LegalSection>

          <LegalSection title="4. Propiedad intelectual e industrial">
            <p>
              La estructura, diseño, programación, selección y presentación de contenidos del sitio,
              así como los textos, elementos gráficos, signos distintivos y demás materiales propios
              de Editorial La Rueca, pueden estar protegidos por la normativa sobre propiedad
              intelectual e industrial.
            </p>

            <p className="mt-3">
              Los libros, textos, fragmentos, fotografías, ilustraciones, portadas y otros
              materiales vinculados a las obras publicadas pueden pertenecer a sus respectivos
              autores, ilustradores, fotógrafos, diseñadores, editoriales colaboradoras u otros
              titulares de derechos.
            </p>

            <p className="mt-3">
              La inclusión de estos contenidos en editoriallarueca.com no supone que Editorial La
              Rueca sea necesariamente titular de todos los derechos existentes sobre ellos.
            </p>

            <p className="mt-3">
              Salvo en los casos permitidos por la legislación vigente o cuando se disponga de la
              autorización correspondiente, no se permite reproducir, distribuir, transformar,
              comunicar públicamente o explotar los contenidos protegidos del sitio.
            </p>
          </LegalSection>

          <LegalSection title="5. Contenidos y disponibilidad">
            <p>
              Editorial La Rueca procura que la información publicada sea correcta y esté
              actualizada. No obstante, pueden producirse errores, omisiones, cambios editoriales o
              interrupciones temporales en el funcionamiento del sitio.
            </p>

            <p className="mt-3">
              Editorial La Rueca podrá modificar, actualizar, suspender o retirar contenidos,
              servicios o funcionalidades cuando resulte necesario, sin perjuicio de los derechos
              que correspondan a las personas usuarias conforme a la legislación aplicable.
            </p>
          </LegalSection>

          <LegalSection title="6. Enlaces externos y plataformas de venta">
            <p>
              Este sitio puede contener enlaces a páginas o servicios gestionados por terceros. En
              particular, determinados libros pueden ofrecer enlaces de compra que dirigen a
              plataformas externas como Amazon o a las tiendas Quares disponibles para diferentes
              países.
            </p>

            <p className="mt-3">
              Cuando la persona usuaria accede a uno de esos enlaces abandona editoriallarueca.com.
              La contratación, el pago, la entrega y demás condiciones de la compra que se realice
              en la plataforma externa estarán sometidos a las condiciones, políticas de privacidad
              y políticas de cookies de dicha plataforma.
            </p>

            <p className="mt-3">
              Editorial La Rueca no controla con carácter general el contenido, disponibilidad ni
              funcionamiento de sitios web de terceros y no asume responsabilidad por actuaciones
              realizadas fuera de editoriallarueca.com, sin perjuicio de las responsabilidades que
              legalmente pudieran corresponderle.
            </p>
          </LegalSection>

          <LegalSection title="7. Protección de datos personales">
            <p>
              El tratamiento de los datos personales facilitados a través del sitio se regula en la{' '}
              <a
                href="/politica-de-privacidad"
                className="font-semibold text-public-red underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red"
              >
                Política de privacidad
              </a>
              .
            </p>

            <p className="mt-3">
              La información relativa al uso de cookies y tecnologías similares está disponible en
              la{' '}
              <a
                href="/politica-de-cookies"
                className="font-semibold text-public-red underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red"
              >
                Política de cookies
              </a>
              .
            </p>
          </LegalSection>

          <LegalSection title="8. Seguridad">
            <p>
              Editorial La Rueca adopta medidas técnicas y organizativas orientadas a proteger la
              información y reducir los riesgos de acceso no autorizado, pérdida, alteración o
              divulgación indebida, teniendo en cuenta la naturaleza de los tratamientos realizados.
            </p>

            <p className="mt-3">
              No obstante, ningún sistema conectado a Internet puede garantizar una seguridad
              absoluta y la persona usuaria también debe adoptar medidas razonables para proteger
              sus dispositivos y credenciales.
            </p>
          </LegalSection>

          <LegalSection title="9. Comunicaciones y reclamaciones">
            <p>
              Para consultas relacionadas con este sitio web, sus contenidos o los servicios de
              Editorial La Rueca, puede utilizarse el correo electrónico{' '}
              <a
                href="mailto:ajimenez@editoriallarueca.com"
                className="font-semibold text-public-red underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red"
              >
                ajimenez@editoriallarueca.com
              </a>{' '}
              o el teléfono{' '}
              <a
                href="tel:+34639289535"
                className="font-semibold text-public-red underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red"
              >
                639 289 535
              </a>
              .
            </p>
          </LegalSection>

          <LegalSection title="10. Legislación aplicable">
            <p>
              Este sitio web y las relaciones derivadas de su utilización se rigen por la
              legislación española, sin perjuicio de las normas de carácter imperativo que puedan
              resultar aplicables en función de la condición y residencia de la persona usuaria.
            </p>
          </LegalSection>

          <LegalSection title="11. Modificaciones">
            <p>
              Editorial La Rueca podrá actualizar este Aviso legal para adaptarlo a cambios en el
              sitio web, en sus servicios o en la normativa aplicable. La versión publicada en esta
              página será la vigente en cada momento.
            </p>
          </LegalSection>

          <p className="text-sm text-public-muted">Última actualización: septiembre de 2026.</p>
        </article>
      </PublicContainer>
    </PublicSection>
  );
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif-public text-2xl font-semibold text-public-ink">{title}</h2>
      <div className="mt-3 text-public-muted">{children}</div>
    </section>
  );
}
