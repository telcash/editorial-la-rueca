import type { Metadata } from 'next';

import { PublicContainer } from '@/components/public/public-container';
import { PublicPageHeader } from '@/components/public/public-page-header';
import { PublicSection } from '@/components/public/public-section';

export const metadata: Metadata = {
  title: 'Política de privacidad | Editorial La Rueca',
  description:
    'Información sobre el tratamiento y protección de datos personales en Editorial La Rueca.',
};

export default function PrivacyPolicyPage() {
  return (
    <PublicSection variant="compact">
      <PublicContainer size="reading">
        <PublicPageHeader
          title="Política de privacidad"
          description="Información sobre cómo Editorial La Rueca trata los datos personales recibidos a través de este sitio web."
        />

        <article className="space-y-8 text-public-body leading-relaxed text-public-ink">
          <PrivacySection title="1. Responsable del tratamiento">
            <p>
              La responsable del tratamiento de los datos personales recogidos a través de este
              sitio web es:
            </p>

            <dl className="mt-4 space-y-2">
              <div>
                <dt className="inline font-semibold text-public-ink">Nombre comercial: </dt>
                <dd className="inline">Editorial La Rueca</dd>
              </div>

              <div>
                <dt className="inline font-semibold text-public-ink">Responsable: </dt>
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
            </dl>
          </PrivacySection>

          <PrivacySection title="2. Datos personales que tratamos">
            <p>
              A través del formulario público “Cuéntanos sobre tu libro”, Editorial La Rueca puede
              recibir los datos que la persona interesada introduce voluntariamente para solicitar
              información sobre servicios editoriales.
            </p>

            <p className="mt-3">Actualmente el formulario puede recoger:</p>

            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>nombre;</li>
              <li>dirección de correo electrónico;</li>
              <li>teléfono;</li>
              <li>provincia;</li>
              <li>servicio editorial de interés;</li>
              <li>mensaje o información facilitada por la persona interesada.</li>
            </ul>

            <p className="mt-3">
              El formulario incluye además controles técnicos orientados a prevenir envíos
              automatizados o abusivos. El valor utilizado por estos controles no forma parte de los
              datos almacenados como solicitud editorial.
            </p>

            <p className="mt-3">
              Actualmente este formulario no solicita datos de pago ni permite adjuntar archivos o
              manuscritos.
            </p>
          </PrivacySection>

          <PrivacySection title="3. Finalidades del tratamiento">
            <p>Los datos recibidos a través de la web pueden utilizarse para:</p>

            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                recibir, gestionar y responder consultas relacionadas con los servicios editoriales;
              </li>
              <li>
                contactar con la persona interesada para ampliar información sobre su proyecto o
                solicitud;
              </li>
              <li>gestionar internamente las solicitudes recibidas y su seguimiento;</li>
              <li>
                enviar al equipo de Editorial La Rueca las notificaciones operativas necesarias para
                atender la solicitud;
              </li>
              <li>
                gestionar, cuando corresponda, actuaciones previas a una eventual contratación de
                servicios editoriales;
              </li>
              <li>cumplir las obligaciones legales que resulten aplicables.</li>
            </ul>
          </PrivacySection>

          <PrivacySection title="4. Base jurídica">
            <p>
              Cuando una persona contacta con Editorial La Rueca para solicitar información sobre
              servicios editoriales o sobre la posible publicación de una obra, el tratamiento de
              los datos resulta necesario para atender la solicitud realizada por la propia persona
              interesada y, cuando corresponda, para adoptar medidas previas a una eventual relación
              contractual.
            </p>

            <p className="mt-3">
              Cuando exista una obligación legal aplicable a Editorial La Rueca, los datos también
              podrán tratarse en la medida necesaria para cumplir dicha obligación.
            </p>

            <p className="mt-3">
              Si en el futuro se incorporan finalidades que requieran consentimiento —por ejemplo,
              determinadas comunicaciones promocionales no vinculadas a una relación previa— se
              solicitará de forma específica, separada y revocable.
            </p>
          </PrivacySection>

          <PrivacySection title="5. Comunicaciones comerciales">
            <p>
              El formulario público actual no constituye una suscripción a una newsletter ni implica
              por sí mismo la aceptación de comunicaciones comerciales periódicas.
            </p>

            <p className="mt-3">
              La información facilitada para realizar una consulta editorial se utilizará para
              gestionar dicha consulta y su seguimiento. Si Editorial La Rueca incorpora en el
              futuro una suscripción a comunicaciones comerciales basada en consentimiento, se
              ofrecerá de manera diferenciada y opcional.
            </p>
          </PrivacySection>

          <PrivacySection title="6. Conservación de los datos">
            <p>
              Los datos personales se conservarán durante el tiempo necesario para gestionar la
              solicitud y mantener la relación derivada de ella.
            </p>

            <p className="mt-3">
              Cuando los datos dejen de ser necesarios para la finalidad para la que fueron
              recogidos, podrán mantenerse debidamente bloqueados durante los plazos necesarios para
              atender posibles responsabilidades u obligaciones legales y, posteriormente, serán
              eliminados.
            </p>
          </PrivacySection>

          <PrivacySection title="7. Destinatarios y proveedores">
            <p>
              Editorial La Rueca no comunica los datos personales del formulario a terceros con
              fines comerciales por el mero hecho de recibir una consulta.
            </p>

            <p className="mt-3">
              Para el funcionamiento técnico de la web y la gestión de las solicitudes pueden
              intervenir proveedores tecnológicos que prestan servicios necesarios, como
              infraestructura de alojamiento, base de datos o correo electrónico. Estos proveedores
              únicamente podrán acceder a información cuando sea necesario para prestar el servicio
              correspondiente y conforme a las obligaciones que resulten aplicables.
            </p>

            <p className="mt-3">
              Los datos también podrán comunicarse a administraciones públicas, autoridades,
              juzgados, tribunales o Fuerzas y Cuerpos de Seguridad cuando exista una obligación
              legal que lo exija.
            </p>

            <p className="mt-3">
              Amazon y Quares pueden aparecer en el sitio como plataformas externas para la compra
              de determinados libros. La existencia de estos enlaces no implica que los datos
              enviados mediante el formulario “Cuéntanos sobre tu libro” sean comunicados a dichas
              plataformas.
            </p>
          </PrivacySection>

          <PrivacySection title="8. Transferencias internacionales">
            <p>
              Algunos proveedores tecnológicos utilizados para prestar servicios por Internet pueden
              operar mediante infraestructuras distribuidas internacionalmente.
            </p>

            <p className="mt-3">
              Cuando un tratamiento implique una transferencia internacional de datos, Editorial La
              Rueca procurará que se realice de acuerdo con las garantías y mecanismos previstos por
              la normativa aplicable en materia de protección de datos.
            </p>
          </PrivacySection>

          <PrivacySection title="9. Seguridad de la información">
            <p>
              Editorial La Rueca adopta medidas técnicas y organizativas adecuadas al tipo de
              información tratada y a los riesgos existentes, con el objetivo de proteger los datos
              frente a accesos no autorizados, pérdida, alteración, divulgación o destrucción.
            </p>

            <p className="mt-3">
              Las medidas concretas pueden adaptarse y revisarse en función de la evolución de los
              sistemas, los servicios utilizados y los riesgos asociados al tratamiento.
            </p>
          </PrivacySection>

          <PrivacySection title="10. Derechos de las personas interesadas">
            <p>
              Las personas interesadas pueden ejercer los derechos reconocidos por la normativa de
              protección de datos cuando resulten aplicables, entre ellos:
            </p>

            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>acceder a sus datos personales;</li>
              <li>solicitar la rectificación de datos inexactos;</li>
              <li>solicitar su supresión;</li>
              <li>solicitar la limitación del tratamiento;</li>
              <li>oponerse al tratamiento;</li>
              <li>solicitar la portabilidad de los datos;</li>
              <li>
                retirar el consentimiento en cualquier momento cuando un tratamiento concreto se
                base en él.
              </li>
            </ul>

            <p className="mt-3">
              La retirada del consentimiento no afectará a la licitud del tratamiento realizado con
              anterioridad a dicha retirada.
            </p>
          </PrivacySection>

          <PrivacySection title="11. Cómo ejercer tus derechos">
            <p>
              Para ejercer tus derechos puedes escribir a{' '}
              <a
                href="mailto:ajimenez@editoriallarueca.com"
                className="font-semibold text-public-red underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red"
              >
                ajimenez@editoriallarueca.com
              </a>{' '}
              indicando qué derecho deseas ejercer y aportando, cuando sea necesario, la información
              que permita verificar tu identidad y localizar los datos relacionados con tu
              solicitud.
            </p>

            <p className="mt-3">
              También puedes dirigirte por escrito a Editorial La Rueca, Peñazarzal Norte 27, 28411,
              Madrid, España.
            </p>
          </PrivacySection>

          <PrivacySection title="12. Reclamaciones ante la autoridad de control">
            <p>
              Si consideras que el tratamiento de tus datos personales no se ajusta a la normativa,
              puedes presentar una reclamación ante la Agencia Española de Protección de Datos
              (AEPD), autoridad de control competente en España.
            </p>

            <p className="mt-3">
              Puedes consultar información sobre tus derechos y los canales de reclamación en el
              sitio oficial de la Agencia Española de Protección de Datos.
            </p>
          </PrivacySection>

          <PrivacySection title="13. Cookies y tecnologías similares">
            <p>
              La información específica sobre las cookies y tecnologías similares utilizadas en
              editoriallarueca.com está disponible en nuestra{' '}
              <a
                href="/politica-de-cookies"
                className="font-semibold text-public-red underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red"
              >
                Política de cookies
              </a>
              .
            </p>
          </PrivacySection>

          <PrivacySection title="14. Enlaces externos">
            <p>
              Este sitio puede incluir enlaces a servicios o plataformas externas. Cuando una
              persona abandona editoriallarueca.com, el tratamiento de datos realizado por el sitio
              de destino queda sometido a sus propias condiciones y políticas de privacidad.
            </p>
          </PrivacySection>

          <PrivacySection title="15. Modificación de esta política">
            <p>
              Editorial La Rueca podrá actualizar esta Política de privacidad cuando cambien los
              tratamientos realizados, los servicios utilizados o los requisitos legales aplicables.
            </p>

            <p className="mt-3">
              La versión publicada en esta página será la vigente en cada momento.
            </p>
          </PrivacySection>

          <p className="text-sm text-public-muted">Última actualización: septiembre de 2026.</p>
        </article>
      </PublicContainer>
    </PublicSection>
  );
}

function PrivacySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif-public text-2xl font-semibold text-public-ink">{title}</h2>
      <div className="mt-3 text-public-muted">{children}</div>
    </section>
  );
}
