'use client';

import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  SOURCE_MEDIUM_DEFAULTS,
  UTM_CAMPAIGNS,
  UTM_FORMATS,
  UTM_MEDIUMS,
  UTM_SOURCES,
} from './utm-generator.constants';
import {
  buildUtmUrl,
  getCampaignValue,
  type UtmDestination,
  type UtmGeneratorValues,
} from './utm-generator.helpers';

interface UtmGeneratorBook {
  id: string;
  title: string;
  slug: string;
}

interface UtmGeneratorAuthor {
  id: string;
  name: string;
  slug: string;
}

interface UtmGeneratorProps {
  baseUrl: string;
  books: UtmGeneratorBook[];
  authors: UtmGeneratorAuthor[];
}

type CampaignType = 'standard' | 'book' | 'author' | 'event' | 'custom';

export function UtmGenerator({ baseUrl, books, authors }: UtmGeneratorProps) {
  const [destinationType, setDestinationType] = useState<UtmDestination['type']>('contact');
  const [destinationId, setDestinationId] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [source, setSource] = useState('instagram');
  const [medium, setMedium] = useState('social');
  const [campaignType, setCampaignType] = useState<CampaignType>('standard');
  const [campaignValue, setCampaignValue] = useState<string>(UTM_CAMPAIGNS[0].value);
  const [format, setFormat] = useState('reel');
  const [contentIdentifier, setContentIdentifier] = useState('');
  const [variant, setVariant] = useState('01');
  const [term, setTerm] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const selectedBook = books.find((book) => book.id === destinationId);
  const selectedAuthor = authors.find((author) => author.id === destinationId);

  const campaign = getCampaignValue(
    campaignType,
    campaignType === 'book'
      ? (selectedBook?.slug ?? '')
      : campaignType === 'author'
        ? (selectedAuthor?.slug ?? '')
        : campaignValue,
  );

  const destination: UtmDestination = {
    type: destinationType,
    bookSlug: destinationType === 'book' ? selectedBook?.slug : undefined,
    authorSlug: destinationType === 'author' ? selectedAuthor?.slug : undefined,
    customUrl: destinationType === 'custom' ? customUrl : undefined,
  };

  const values: UtmGeneratorValues = {
    source,
    medium,
    campaign,
    format,
    contentIdentifier,
    variant,
    term,
  };

  const generatedUrl = buildUtmUrl({ baseUrl: new URL(baseUrl), destination, values });

  function handleSourceChange(nextSource: string) {
    setSource(nextSource);
    const recommendedMedium = SOURCE_MEDIUM_DEFAULTS[nextSource];
    if (recommendedMedium) {
      setMedium(recommendedMedium);
    }
  }

  async function handleCopy() {
    if (!generatedUrl || !navigator.clipboard) {
      setCopyStatus('error');
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 2200);
    } catch {
      setCopyStatus('error');
    }
  }

  useEffect(() => {
    if (copyStatus === 'error') {
      const timeout = window.setTimeout(() => setCopyStatus('idle'), 3000);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [copyStatus]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
      <section
        className="rounded-lg border bg-card p-5 shadow-sm sm:p-6"
        aria-labelledby="utm-form-title"
      >
        <h2 id="utm-form-title" className="text-lg font-semibold">
          Configuración del enlace
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="utm-destination">Destino</Label>
            <select
              id="utm-destination"
              value={destinationType}
              onChange={(event) => {
                setDestinationType(event.target.value as UtmDestination['type']);
                setDestinationId('');
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="contact">Publica tu libro</option>
              <option value="home">Home</option>
              <option value="book">Libro</option>
              <option value="author">Autor</option>
              <option value="custom">URL personalizada</option>
            </select>
          </div>

          {destinationType === 'book' ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="utm-book">Libro</Label>
              <select
                id="utm-book"
                value={destinationId}
                onChange={(event) => setDestinationId(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Selecciona un libro</option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {destinationType === 'author' ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="utm-author">Autor</Label>
              <select
                id="utm-author"
                value={destinationId}
                onChange={(event) => setDestinationId(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Selecciona un autor</option>
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {destinationType === 'custom' ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="utm-custom-url">URL personalizada</Label>
              <Input
                id="utm-custom-url"
                value={customUrl}
                onChange={(event) => setCustomUrl(event.target.value)}
                placeholder="/libros/mi-libro o https://editoriallarueca.com/..."
                inputMode="url"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="utm-source">Fuente</Label>
            <select
              id="utm-source"
              value={source}
              onChange={(event) => handleSourceChange(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {UTM_SOURCES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="utm-medium">Medio</Label>
            <select
              id="utm-medium"
              value={medium}
              onChange={(event) => setMedium(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {UTM_MEDIUMS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="utm-campaign-type">Campaña</Label>
            <select
              id="utm-campaign-type"
              value={campaignType}
              onChange={(event) => {
                const nextType = event.target.value as CampaignType;
                setCampaignType(nextType);
                setCampaignValue(nextType === 'standard' ? UTM_CAMPAIGNS[0].value : '');
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="standard">Campaña estándar</option>
              <option value="book">Libro</option>
              <option value="author">Autor</option>
              <option value="event">Evento</option>
              <option value="custom">Personalizada</option>
            </select>
          </div>

          {campaignType === 'standard' ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="utm-campaign">Nombre de campaña</Label>
              <select
                id="utm-campaign"
                value={campaignValue}
                onChange={(event) => setCampaignValue(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {UTM_CAMPAIGNS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {campaignType === 'book' || campaignType === 'author' ? (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              {campaignType === 'book'
                ? 'Se usará el slug del libro como campaña.'
                : 'Se usará el slug del autor como campaña.'}
            </p>
          ) : null}

          {campaignType === 'event' || campaignType === 'custom' ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="utm-campaign-value">
                {campaignType === 'event' ? 'Nombre del evento' : 'Nombre personalizado'}
              </Label>
              <Input
                id="utm-campaign-value"
                value={campaignValue}
                onChange={(event) => setCampaignValue(event.target.value)}
                placeholder="Presentación Kotigoroshko"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="utm-format">Formato</Label>
            <select
              id="utm-format"
              value={format}
              onChange={(event) => setFormat(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {UTM_FORMATS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="utm-variant">Variante</Label>
            <Input
              id="utm-variant"
              type="number"
              min={1}
              max={99}
              value={variant}
              onChange={(event) => setVariant(event.target.value)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="utm-content-identifier">Identificador de contenido</Label>
            <Input
              id="utm-content-identifier"
              value={contentIdentifier}
              onChange={(event) => setContentIdentifier(event.target.value)}
              placeholder="Manuscrito del cajón"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="utm-term">
              UTM term <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="utm-term"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="madrid"
            />
          </div>
        </div>
      </section>

      <aside
        className="h-fit rounded-lg border bg-muted/30 p-5 sm:p-6"
        aria-labelledby="utm-result-title"
      >
        <h2 id="utm-result-title" className="text-lg font-semibold">
          URL generada
        </h2>
        <p className="mt-4 min-h-20 break-all rounded-md border bg-background p-3 text-sm leading-6">
          {generatedUrl ?? 'Completa los campos obligatorios para generar un enlace.'}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!generatedUrl}
          className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copyStatus === 'copied' ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {copyStatus === 'copied' ? 'Enlace copiado' : 'Copiar enlace'}
        </button>
        {copyStatus === 'error' ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            No se pudo copiar el enlace. Cópialo manualmente.
          </p>
        ) : null}

        <div className="mt-8 border-t pt-5 text-sm text-muted-foreground">
          <h3 className="font-semibold text-foreground">Convención UTM</h3>
          <dl className="mt-3 space-y-2">
            <div>
              <dt className="inline font-medium text-foreground">Source:</dt>{' '}
              <dd className="inline">plataforma u origen.</dd>
            </div>
            <div>
              <dt className="inline font-medium text-foreground">Medium:</dt>{' '}
              <dd className="inline">tipo de tráfico.</dd>
            </div>
            <div>
              <dt className="inline font-medium text-foreground">Campaign:</dt>{' '}
              <dd className="inline">objetivo o iniciativa.</dd>
            </div>
            <div>
              <dt className="inline font-medium text-foreground">Content:</dt>{' '}
              <dd className="inline">pieza concreta.</dd>
            </div>
            <div>
              <dt className="inline font-medium text-foreground">Term:</dt>{' '}
              <dd className="inline">segmentación opcional.</dd>
            </div>
          </dl>
          <p className="mt-4">
            Utiliza siempre el generador para mantener una nomenclatura consistente en las campañas
            de Editorial La Rueca.
          </p>
        </div>
      </aside>
    </div>
  );
}
