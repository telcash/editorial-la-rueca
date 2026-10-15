import Image from 'next/image';
import type { Metadata } from 'next';
import { Coustard } from 'next/font/google';
import { ArrowRight, BookOpen, LayoutTemplate, Palette, Plus, Printer, Truck } from 'lucide-react';

import { PublicButton } from '@/components/public/public-button';
import {
  CompletePricingCalculator,
  IndividualPricingCalculators,
} from '@/features/public/pricing/components/pricing-calculators';
import styles from '@/features/public/pricing/components/pricing.module.css';

const coustard = Coustard({
  subsets: ['latin'],
  weight: ['400', '900'],
  variable: '--font-pricing-heading',
  display: 'swap',
});

const title = 'Servicios y tarifas editoriales';
const description =
  'Estima la maquetación, cubierta, impresión y envío de tu libro. Consulta servicios editoriales independientes y solicita tu presupuesto personalizado.';
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/servicios-y-tarifas' },
  openGraph: { title, description, url: '/servicios-y-tarifas' },
  twitter: { card: 'summary_large_image', title, description },
};

const benefits = [
  {
    title: 'Maquetación',
    icon: LayoutTemplate,
    text: 'Composición del interior y preparación de las páginas para el formato final de impresión.',
  },
  {
    title: 'Diseño de cubierta',
    icon: Palette,
    text: 'Creación y preparación de una cubierta a color con solapas, adaptada a las especificaciones de la edición.',
  },
  {
    title: 'Impresión',
    icon: Printer,
    text: 'Producción de la tirada elegida en formato 15 × 21 cm, interior en blanco y negro.',
  },
  {
    title: 'Envío',
    icon: Truck,
    text: 'Porte de la tirada a un único punto de entrega en la península, tal como figura en las tarifas.',
  },
] as const;

const process = [
  {
    title: 'Corrección de estilo',
    text: 'Claridad, ritmo y coherencia sin perder la voz del autor.',
    tag: 'Servicio individual',
    included: false,
  },
  {
    title: 'Corrección ortotipográfica',
    text: 'Ortografía, puntuación y normas tipográficas.',
    tag: 'Servicio individual',
    included: false,
  },
  {
    title: 'Maquetación',
    text: 'Interior listo para la edición impresa o publicación en Amazon.',
    tag: 'Incluida en la propuesta',
    included: true,
  },
  {
    title: 'Diseño de cubierta',
    text: 'Cubierta preparada para el acabado y las medidas elegidas.',
    tag: 'Incluido en la propuesta',
    included: true,
  },
  {
    title: 'ISBN y depósito legal',
    text: 'Identificación bibliográfica y trámites según el tipo de proyecto.',
    tag: 'Consultar condiciones',
    included: false,
  },
  {
    title: 'Impresión y envío',
    text: 'Producción física y entrega a un punto de la península en la propuesta principal.',
    tag: 'Incluidos en la propuesta',
    included: true,
  },
  {
    title: 'Distribución',
    text: 'Disponibilidad del libro en canales y plataformas acordados.',
    tag: 'Consultar condiciones',
    included: false,
  },
  {
    title: 'Promoción',
    text: 'Acciones y materiales para dar a conocer la obra.',
    tag: 'Presupuesto a medida',
    included: false,
  },
] as const;

const questions = [
  [
    '¿Qué incluye la estimación principal?',
    'Maquetación, diseño de cubierta, impresión y envío a un punto de la península, con las especificaciones detalladas en esta página. Correcciones, gestión de publicación, distribución y promoción no se presuponen incluidas en este cálculo.',
  ],
  [
    '¿Qué significa «Hasta 150 páginas»?',
    'Es el máximo de páginas de ese tramo: incluye libros de 101 a 150 páginas. Si el libro acaba teniendo 151, se aplica el tramo siguiente, hasta 200. Se confirmará una vez maquetado.',
  ],
  [
    '¿El precio de la calculadora es definitivo?',
    'No. Se trata de una estimación previa. Si las páginas reales tras maquetar el libro difieren de las previstas, la factura podrá ajustarse y el autor será informado previamente.',
  ],
  [
    '¿Puedo contratar solo maquetación, corrección o impresión?',
    'Sí. Dispones de tarifas independientes y opciones personalizadas. Si tu libro contiene fotografías, tablas, ilustraciones o supera los tramos publicados, solicita una valoración específica.',
  ],
  [
    '¿Por qué no hay precio de Amazon para 151–200 páginas?',
    'Ese tramo no figura en las tarifas publicadas. Preferimos indicarlo con transparencia y confirmarlo antes de publicar un importe.',
  ],
  [
    '¿Cuántos ejemplares recibo en «Solo impresión»?',
    'Ese servicio indica una entrega de cinco ejemplares menos que la tirada solicitada. La entrega, los gastos de envío y otros aspectos del servicio se deben confirmar en el presupuesto.',
  ],
  [
    '¿Los importes incluyen impuestos?',
    'La estimación principal indica precios sin IVA. El presupuesto final aclarará el tratamiento fiscal aplicable y el importe total. El precio definitivo se confirmará tras valorar el proyecto.',
  ],
  [
    '¿Conservo mis derechos de autor?',
    'La Rueca comunica que el autor conserva sus derechos. Los términos específicos y el alcance del servicio se detallarán en el acuerdo aplicable.',
  ],
] as const;

export default function ServicesAndPricingPage() {
  return (
    <div className={`${styles.page} ${coustard.variable}`}>
      <header className={styles.hero}>
        <Image
          src="/brand/home-hero.png"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="100vw"
          className={styles.heroImage}
        />
        <div className={styles.wrap}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>Editorial La Rueca · Servicios y tarifas</p>
            <h1>
              Servicios y tarifas <span>editoriales</span>
            </h1>
            <p className={styles.heroPromise}>
              Tu libro merece una buena edición.
              <br />
              Tu presupuesto, claridad.
            </p>
            <p className={styles.heroLead}>
              Transformamos tu manuscrito en un libro cuidado, sin complicaciones. Descubre qué
              incluye nuestra propuesta de maquetación, cubierta e impresión y calcula una
              estimación de precio en unos segundos.
            </p>
            <div className={styles.heroActions}>
              <PublicButton href="#calculadora">
                Calcular mi presupuesto <ArrowRight size={18} aria-hidden="true" />
              </PublicButton>
              <PublicButton href="#individuales" variant="secondary">
                Ver servicios individuales
              </PublicButton>
            </div>
            <div className={styles.trust}>
              <span>Edición con identidad</span>
              <span>Tu libro. Tus derechos, siempre.</span>
            </div>
          </div>
        </div>
      </header>
      <section
        className={`${styles.section} ${styles.whiteSection}`}
        id="incluye"
        aria-labelledby="included-heading"
      >
        <div className={styles.wrap}>
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>Nuestra propuesta editorial</p>
            <h2 id="included-heading">Un presupuesto. Todas las etapas esenciales.</h2>
            <p>
              Para un libro en papel con las características indicadas, la estimación reúne estos
              cuatro trabajos. Puedes contratar otros servicios editoriales por separado.
            </p>
          </div>
          <div className={styles.benefitGrid}>
            {benefits.map(({ title, text, icon: Icon }) => (
              <article key={title} className={styles.benefit}>
                <Icon size={30} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className={styles.section} id="calculadora" aria-labelledby="calculator-heading">
        <div className={styles.wrap}>
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>Calcula tu presupuesto</p>
            <h2 id="calculator-heading">¿Cuánto costará preparar e imprimir tu libro?</h2>
            <p>
              Elige el <strong>máximo de páginas</strong> previsto y la tirada. Por ejemplo, un
              libro de 130 páginas entra en el tramo <strong>«Hasta 150»</strong>. Los importes son
              estimaciones, no presupuestos definitivos.
            </p>
          </div>
          <CompletePricingCalculator />
          <p className={styles.note}>
            <strong>¿Tu libro supera las 400 páginas?</strong> Solicita una propuesta personalizada.
            Las opciones «Hasta…» representan un límite máximo, no una extensión exacta. No se
            incluyen por defecto correcciones, ISBN, depósito legal, distribución, publicación en
            Amazon ni promoción en esta estimación.
          </p>
        </div>
      </section>
      <section
        className={`${styles.section} ${styles.whiteSection}`}
        id="individuales"
        aria-labelledby="individual-heading"
      >
        <div className={styles.wrap}>
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>Servicios editoriales independientes</p>
            <h2 id="individual-heading">¿Solo necesitas una parte del proceso?</h2>
            <p>
              No todos los autores parten del mismo punto. Puedes pedir únicamente el trabajo que le
              falta a tu libro o completar el proceso con apoyo profesional.
            </p>
          </div>
          <IndividualPricingCalculators />
        </div>
      </section>
      <section
        className={`${styles.section} ${styles.whiteSection}`}
        id="proceso"
        aria-labelledby="process-heading"
      >
        <div className={styles.wrap}>
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>Acompañamos cada etapa</p>
            <h2 id="process-heading">Todo lo que interviene en la vida de un libro</h2>
            <p>
              De la primera revisión a su encuentro con los lectores: conoce qué hace cada servicio.
              Algunos están disponibles de forma independiente o requieren presupuesto a medida.
            </p>
          </div>
          <div className={styles.processGrid}>
            {process.map((step, index) => (
              <article key={step.title} className={styles.processCard}>
                <span className={styles.processNumber}>{String(index + 1).padStart(2, '0')}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                <span className={`${styles.tag} ${step.included ? '' : styles.separateTag}`}>
                  {step.tag}
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className={styles.section} id="preguntas" aria-labelledby="faq-heading">
        <div className={`${styles.wrap} ${styles.faq}`}>
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>Antes de empezar</p>
            <h2 id="faq-heading">Preguntas frecuentes</h2>
            <p>
              Precios claros, expectativas claras. Estas respuestas distinguen las opciones
              individuales.
            </p>
          </div>
          <div>
            {questions.map(([question, answer], index) => (
              <details key={question} open={index === 0}>
                <summary>
                  {question}
                  <Plus size={22} aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className={styles.cta} aria-labelledby="cta-heading">
        <div className={styles.wrap}>
          <div>
            <BookOpen size={28} aria-hidden="true" />
            <h2 id="cta-heading">
              Tu libro, tus derechos.
              <br />
              Hablemos de tu proyecto.
            </h2>
            <p>
              Cuéntanos qué necesitas y Almudena te preparará un presupuesto personalizado para tu
              obra.
            </p>
          </div>
          <PublicButton href="/#publica-tu-libro">
            Solicitar presupuesto <ArrowRight size={18} aria-hidden="true" />
          </PublicButton>
        </div>
      </section>
    </div>
  );
}
