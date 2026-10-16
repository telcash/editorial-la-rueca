'use client';

import { useRef, useState } from 'react';
import { ArrowRight, Check, Copy } from 'lucide-react';

import { PublicButton } from '@/components/public/public-button';
import {
  buildCompleteEstimateSummary,
  copyCounts,
  describeEstimate,
  formatCount,
  formatMoney,
  formatUnitPrice,
  getIndividualEstimate,
  getPrintEstimate,
  individualStartingPrices,
  pageLimits,
} from '../lib/editorial-pricing';
import styles from './pricing.module.css';

const contactHref = '/#publica-tu-libro';

export function CompletePricingCalculator() {
  const [pages, setPages] = useState<number>(200);
  const [copies, setCopies] = useState<number>(50);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'manual'>('idle');
  const estimate = getPrintEstimate('complete', pages, copies);
  const summary = buildCompleteEstimateSummary(pages, copies);

  function selectValue(type: 'pages' | 'copies', value: number) {
    if (type === 'pages') setPages(value);
    else setCopies(value);
    setCopyStatus('idle');
  }

  async function copySummary() {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('manual');
    }
  }

  return (
    <div className={styles.calculator}>
      <div className={styles.inputs}>
        <fieldset>
          <legend>01. Extensión del libro</legend>
          <p className={styles.small}>Selecciona el límite superior</p>
          <div className={styles.choices}>
            {pageLimits.map((limit) => (
              <button
                type="button"
                key={limit}
                aria-pressed={pages === limit}
                aria-label={`Hasta ${limit} páginas`}
                onClick={() => selectValue('pages', limit)}
              >
                Hasta {limit}
              </button>
            ))}
          </div>
        </fieldset>
        <p className={styles.hint}>
          El precio seleccionado cubre un libro de hasta {pages} páginas.
        </p>
        <fieldset>
          <legend>02. Ejemplares impresos</legend>
          <div className={styles.choices}>
            {copyCounts.map((count) => (
              <button
                type="button"
                key={count}
                aria-pressed={copies === count}
                aria-label={`${formatCount(count)} ejemplares`}
                onClick={() => selectValue('copies', count)}
              >
                {formatCount(count)}
              </button>
            ))}
          </div>
        </fieldset>
        <div className={styles.format}>
          <strong>Así será tu libro</strong>
          <ul className={styles.formatTags}>
            <li>Formato 15 × 21 cm</li>
            <li>Interior B/N</li>
            <li>Papel ahuesado 90 g</li>
          </ul>
          <p>
            Cubierta a color en papel blanco estucado mate de <strong>270 g</strong>, plastificada
            por una cara y con <strong>solapas de 9 cm</strong>. Aplicable a interiores sin
            fotografías, imágenes ni tablas.
          </p>
          <p>
            Incluye el envío a <strong>un único punto de la península</strong>. Para otros formatos,
            interiores ilustrados o envíos especiales, solicita presupuesto.
          </p>
        </div>
      </div>
      <aside className={styles.summary} aria-label="Presupuesto estimado principal">
        <div className={styles.priceOverview}>
          <p className={styles.eyebrow} id="total-price-label">
            Presupuesto estimado
          </p>
          <p className={`${styles.eyebrow} ${styles.unitPriceLabel}`} id="unit-price-label">
            Por ejemplar
          </p>
          <output
            className={styles.amount}
            id="total-price"
            aria-labelledby="total-price-label"
            aria-live="polite"
            aria-atomic="true"
          >
            {estimate.kind === 'priced' ? formatMoney(estimate.amount) : 'Consultar presupuesto'}
          </output>
          <output
            className={styles.unitAmount}
            id="unit-price"
            aria-labelledby="unit-price-label"
            aria-describedby="unit-price-note"
            aria-live="polite"
            aria-atomic="true"
          >
            {estimate.kind === 'priced' ? formatUnitPrice(estimate.amount, copies) : 'Consultar'}
          </output>
        </div>
        <p id="unit-price-note" className={styles.unitPriceNote}>
          Coste medio del presupuesto completo, no una tarifa de impresión independiente. IVA no
          incluido.
        </p>
        <dl>
          <div>
            <dt>Extensión cubierta</dt>
            <dd>Hasta {pages} páginas</dd>
          </div>
          <div>
            <dt>Tirada solicitada</dt>
            <dd>{formatCount(copies)} ejemplares</dd>
          </div>
          <div className={styles.includedSummary}>
            <dt>Incluye</dt>
            <dd>
              Maquetación · Cubierta · Impresión · ISBN y depósito legal · Distribución y envío
            </dd>
          </div>
        </dl>
        <button type="button" className={styles.primaryButton} onClick={copySummary}>
          {copyStatus === 'copied' ? (
            <Check size={17} aria-hidden="true" />
          ) : (
            <Copy size={17} aria-hidden="true" />
          )}
          {copyStatus === 'copied' ? 'Estimación copiada' : 'Copiar estimación'}
        </button>
        <p role="status" className={styles.copyStatus}>
          {copyStatus === 'copied'
            ? 'Puedes pegarla en tu consulta.'
            : copyStatus === 'manual'
              ? 'No se pudo copiar. Selecciona el resumen para copiarlo manualmente.'
              : ''}
        </p>
        {copyStatus === 'manual' ? (
          <label className={styles.manualCopy}>
            Resumen de la estimación
            <textarea
              readOnly
              value={summary ?? ''}
              onFocus={(event) => event.currentTarget.select()}
              rows={6}
            />
          </label>
        ) : null}
        <PublicButton href={contactHref} variant="secondary" className={styles.summaryContact}>
          Solicitar presupuesto personalizado <ArrowRight size={17} aria-hidden="true" />
        </PublicButton>
        <p className={styles.disclaimer}>
          <strong>Importante:</strong> cálculo orientativo según tarifas 2026–2027, sin IVA. El
          número final de páginas depende de la maquetación y puede cambiar el precio. Almudena
          revisará el proyecto y confirmará el importe antes de contratar.
        </p>
      </aside>
    </div>
  );
}

const individualServices = [
  {
    title: 'Solo maquetación',
    category: 'EDITORIAL',
    description: 'Preparación del interior de un libro sin fotografías.',
    price: individualStartingPrices.layout,
    mode: 'layout',
    action: 'Calcular según páginas',
  },
  {
    title: 'Maquetación para Amazon',
    category: 'AMAZON',
    description:
      'Maquetación, subida del libro a Amazon y diseño de cubierta adaptada a la plataforma.',
    price: individualStartingPrices.amazon,
    mode: 'amazon',
    action: 'Consultar tarifas',
  },
  {
    title: 'Solo impresión',
    category: 'IMPRENTA',
    description:
      'Para interiores y cubiertas preparados; incluye revisión técnica y los elementos indicados en las condiciones.',
    price: individualStartingPrices.printing,
    mode: 'printing',
    action: 'Calcular impresión',
  },
  {
    title: 'Corrección ortotipográfica y de estilo',
    category: 'TEXTO',
    description: 'Ortografía, puntuación, coherencia y fluidez, respetando tu voz.',
    price: individualStartingPrices.correctionPerWord,
    action: 'Pedir valoración',
    perWord: true,
  },
  {
    title: 'Informe de lectura',
    category: 'VALORACIÓN',
    description: 'Una mirada profesional al manuscrito, sus fortalezas y oportunidades de mejora.',
    price: individualStartingPrices.readingReport,
    action: 'Solicitar informe',
  },
  {
    title: 'Diseño de cubierta',
    category: 'CUBIERTA',
    description: `${formatMoney(individualStartingPrices.coverWithPhoto)} si proporcionas la fotografía. ${formatMoney(individualStartingPrices.coverWithoutPhoto)} sin fotografía aportada, con diseño básico sin ilustración manual.`,
    price: individualStartingPrices.coverWithPhoto,
    action: 'Consultar diseño',
  },
  {
    title: 'Ghostwriting',
    category: 'ESCRITURA',
    description:
      'Te ayudamos a dar forma a tu historia o proyecto de escritura. Presupuesto adaptado al alcance y extensión.',
    action: 'Solicitar presupuesto',
  },
] as const;

const tabs = [
  { key: 'layout', label: 'Solo maquetación' },
  { key: 'amazon', label: 'Para Amazon' },
  { key: 'printing', label: 'Solo impresión' },
] as const;
type Tab = (typeof tabs)[number]['key'];

export function IndividualPricingCalculators() {
  const [tab, setTab] = useState<Tab>('layout');
  const [layoutPages, setLayoutPages] = useState('180');
  const [amazonPages, setAmazonPages] = useState('140');
  const [printPages, setPrintPages] = useState(200);
  const [printCopies, setPrintCopies] = useState(50);
  const estimatorRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement>>>({});

  function chooseTab(next: Tab, scroll = false) {
    setTab(next);
    tabRefs.current[next]?.focus({ preventScroll: true });
    if (scroll)
      estimatorRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
  }

  const printingEstimate = getPrintEstimate('printing', printPages, printCopies);

  return (
    <>
      <div className={styles.individualGrid}>
        {individualServices.map((service, index) => (
          <article className={styles.individualCard} key={service.title}>
            <span className={styles.eyebrow}>
              {String(index + 1).padStart(2, '0')} / {service.category}
            </span>
            <h3>{service.title}</h3>
            <p>{service.description}</p>
            <div className={styles.starting}>
              {'price' in service ? (
                <>
                  Desde <strong>{formatMoney(service.price)}</strong>
                  {'perWord' in service ? ' / palabra' : null}
                </>
              ) : (
                <strong>Presupuesto personalizado</strong>
              )}
            </div>
            {'mode' in service ? (
              <button
                type="button"
                className={styles.detailLink}
                onClick={() => chooseTab(service.mode, true)}
              >
                {service.action}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            ) : (
              <a className={styles.detailLink} href={contactHref}>
                {service.action}
                <ArrowRight size={17} aria-hidden="true" />
              </a>
            )}
          </article>
        ))}
      </div>
      <div
        className={styles.independentEstimator}
        ref={estimatorRef}
        id="calculadoras-individuales"
      >
        <p className={styles.eyebrow}>Detalle de tarifas</p>
        <h3>Calcula un servicio individual</h3>
        <p>
          Consulta las tarifas por extensión o tirada. Los casos especiales deben ser valorados por
          la editorial.
        </p>
        <div
          role="tablist"
          aria-label="Selecciona el servicio a presupuestar"
          className={styles.tabs}
        >
          {tabs.map((item, index) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              id={`tab-${item.key}`}
              ref={(element) => {
                if (element) tabRefs.current[item.key] = element;
              }}
              aria-controls={`panel-${item.key}`}
              aria-selected={tab === item.key}
              tabIndex={tab === item.key ? 0 : -1}
              onClick={() => chooseTab(item.key)}
              onKeyDown={(event) => {
                let next: number | undefined;
                if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
                if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
                if (event.key === 'Home') next = 0;
                if (event.key === 'End') next = tabs.length - 1;
                if (next !== undefined) {
                  event.preventDefault();
                  chooseTab(tabs[next].key);
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        {(['layout', 'amazon'] as const).map((service) => {
          const pages = service === 'layout' ? layoutPages : amazonPages;
          const estimate = getIndividualEstimate(service, Number(pages));
          return (
            <div
              key={service}
              id={`panel-${service}`}
              role="tabpanel"
              aria-labelledby={`tab-${service}`}
              hidden={tab !== service}
              tabIndex={0}
              className={styles.panel}
            >
              <p>
                {service === 'layout'
                  ? 'Maquetación del interior, para libros sin fotografías. Introduce un número de páginas y se aplicará el tramo correspondiente.'
                  : 'Incluye maquetación, subida del libro a Amazon y diseño de cubierta adaptada a la plataforma.'}
              </p>
              <div className={styles.controls}>
                <label htmlFor={`${service}-pages`}>
                  Páginas estimadas
                  <input
                    id={`${service}-pages`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={pages}
                    aria-describedby={`${service}-band`}
                    aria-invalid={estimate.kind === 'consult' && estimate.reason === 'invalid'}
                    onChange={(event) =>
                      (service === 'layout' ? setLayoutPages : setAmazonPages)(event.target.value)
                    }
                  />
                </label>
                <div className={styles.individualResult} aria-live="polite" aria-atomic="true">
                  <span>Presupuesto estimado</span>
                  <strong>
                    {estimate.kind === 'priced'
                      ? formatMoney(estimate.amount)
                      : 'Consultar presupuesto'}
                  </strong>
                  <span id={`${service}-band`}>{describeEstimate(estimate)}</span>
                </div>
              </div>
              <p className={styles.small}>
                {service === 'layout'
                  ? 'Para más de 400 páginas, presupuesto personalizado.'
                  : 'Tramo 151–200 páginas: tarifa pendiente de confirmar. No se calculan importes por aproximación.'}
              </p>
            </div>
          );
        })}
        <div
          id="panel-printing"
          role="tabpanel"
          aria-labelledby="tab-printing"
          hidden={tab !== 'printing'}
          tabIndex={0}
          className={styles.panel}
        >
          <p>
            Tarifa para libros ya preparados. Revisión por la editorial e incorporación de ISBN,
            logotipo editorial y depósito legal si el material está correcto, según las condiciones
            del servicio.
          </p>
          <div className={styles.printControls}>
            <label htmlFor="printing-pages">
              Hasta cuántas páginas
              <select
                id="printing-pages"
                value={printPages}
                onChange={(event) => setPrintPages(Number(event.target.value))}
              >
                {pageLimits.map((limit) => (
                  <option key={limit} value={limit}>
                    Hasta {limit}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="printing-copies">
              Ejemplares de la tirada
              <select
                id="printing-copies"
                value={printCopies}
                onChange={(event) => setPrintCopies(Number(event.target.value))}
              >
                {copyCounts.map((count) => (
                  <option key={count} value={count}>
                    {formatCount(count)}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.individualResult} aria-live="polite" aria-atomic="true">
              <span>Presupuesto estimado</span>
              <strong>
                {printingEstimate.kind === 'priced'
                  ? formatMoney(printingEstimate.amount)
                  : 'Consultar presupuesto'}
              </strong>
              <span>Entrega prevista al autor: {formatCount(printCopies - 5)} ejemplares*</span>
            </div>
          </div>
          <p className={styles.warning}>
            * Se entregan <strong>cinco ejemplares menos</strong> que la tirada seleccionada.
            Confirma con Almudena la aplicación de esta condición y los gastos de envío. No se
            presupone envío incluido.
          </p>
        </div>
      </div>
      <p className={styles.note}>
        Estas cifras están sujetas a valoración de cada proyecto. El precio definitivo, impuestos
        aplicables, plazos y servicios asociados se indicarán en el presupuesto personalizado.
      </p>
    </>
  );
}
