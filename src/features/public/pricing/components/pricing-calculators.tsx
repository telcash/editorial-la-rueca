'use client';

import { useState } from 'react';
import { ArrowRight, Check, ChevronDown, Copy } from 'lucide-react';

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
    action: 'Calcular según páginas',
  },
  {
    title: 'Solo impresión',
    category: 'IMPRENTA',
    description:
      'Impresión de interiores y cubiertas ya preparados. Recibirás todos los ejemplares encargados.',
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

function PageServiceCalculator({ service }: { service: 'layout' | 'amazon' }) {
  const [pages, setPages] = useState(service === 'layout' ? '180' : '140');
  const estimate = getIndividualEstimate(service, Number(pages));

  return (
    <>
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
          onChange={(event) => setPages(event.target.value)}
        />
      </label>
      <div className={styles.individualResult} aria-live="polite" aria-atomic="true">
        <span>Presupuesto estimado</span>
        {estimate.kind === 'priced' ? <strong>{formatMoney(estimate.amount)}</strong> : null}
        <span id={`${service}-band`}>{describeEstimate(estimate)}</span>
      </div>
      {estimate.kind === 'consult' ? (
        <a className={styles.detailLink} href={contactHref}>
          Solicitar presupuesto personalizado <ArrowRight size={17} aria-hidden="true" />
        </a>
      ) : null}
    </>
  );
}

function PrintingServiceCalculator() {
  const [pages, setPages] = useState('200');
  const [copies, setCopies] = useState('50');
  const pageCount = Number(pages);
  const copyCount = Number(copies);
  const estimate = getPrintEstimate('printing', pageCount, copyCount);

  return (
    <>
      <label htmlFor="printing-pages">
        Páginas estimadas
        <input
          id="printing-pages"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={pages}
          aria-invalid={!Number.isSafeInteger(pageCount) || pageCount < 1}
          onChange={(event) => setPages(event.target.value)}
        />
      </label>
      <label htmlFor="printing-copies">
        Ejemplares solicitados
        <input
          id="printing-copies"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          list="printing-copy-options"
          value={copies}
          aria-describedby="printing-copy-hint"
          aria-invalid={!copyCounts.some((count) => count === copyCount)}
          onChange={(event) => setCopies(event.target.value)}
        />
        <datalist id="printing-copy-options">
          {copyCounts.map((count) => (
            <option key={count} value={count} />
          ))}
        </datalist>
      </label>
      <p id="printing-copy-hint" className={styles.small}>
        Tiradas disponibles: {copyCounts.map(formatCount).join(', ')} ejemplares.
      </p>
      <div className={styles.individualResult} aria-live="polite" aria-atomic="true">
        <span>Presupuesto estimado</span>
        {estimate.kind === 'priced' ? (
          <>
            <strong>{formatMoney(estimate.amount)}</strong>
            <span>{describeEstimate(estimate)}</span>
            <span>
              Por ejemplar: <b>{formatUnitPrice(estimate.amount, copyCount)}</b>
            </span>
            <span>Entrega al autor: {formatCount(copyCount)} ejemplares.</span>
          </>
        ) : (
          <span>
            {Number.isSafeInteger(pageCount) && pageCount > 400
              ? 'Para más de 400 páginas, presupuesto personalizado.'
              : 'Introduce páginas válidas y una de las tiradas disponibles.'}
          </span>
        )}
      </div>
      {estimate.kind === 'consult' ? (
        <a className={styles.detailLink} href={contactHref}>
          Solicitar presupuesto personalizado <ArrowRight size={17} aria-hidden="true" />
        </a>
      ) : null}
      <p className={styles.small}>
        Solo impresión: no incluye edición, publicación ni gestión del depósito legal. Los gastos de
        envío deben confirmarse; no se presupone envío incluido.
      </p>
    </>
  );
}

export function IndividualPricingCalculators() {
  return (
    <>
      <div className={styles.individualGrid}>
        {individualServices.map((service, index) => (
          <article className={styles.individualCard} key={service.title}>
            <div className={styles.individualCardOverview}>
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
            </div>
            {'mode' in service ? (
              <details className={styles.cardDisclosure}>
                <summary className={styles.detailLink} aria-controls={`calculator-${service.mode}`}>
                  {service.action}
                  <ChevronDown size={17} aria-hidden="true" />
                </summary>
                <div
                  id={`calculator-${service.mode}`}
                  role="region"
                  aria-label={`Calculadora: ${service.title}`}
                  className={styles.cardCalculator}
                >
                  {service.mode === 'printing' ? (
                    <PrintingServiceCalculator />
                  ) : (
                    <PageServiceCalculator service={service.mode} />
                  )}
                </div>
              </details>
            ) : (
              <a className={styles.detailLink} href={contactHref}>
                {service.action}
                <ArrowRight size={17} aria-hidden="true" />
              </a>
            )}
          </article>
        ))}
      </div>
      <p className={styles.note}>
        Estas cifras están sujetas a valoración de cada proyecto. El precio definitivo, impuestos
        aplicables, plazos y servicios asociados se indicarán en el presupuesto personalizado.
      </p>
    </>
  );
}
