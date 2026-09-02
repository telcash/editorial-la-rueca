import { ExternalLink } from 'lucide-react';

import { PublicContainer } from '@/components/public/public-container';
import { PublicSection } from '@/components/public/public-section';
import { SectionHeading } from '@/components/public/section-heading';
import type { PublicPurchaseChannel } from '@/services/sales/sales.types';

interface BookPurchaseSectionProps {
  channels: PublicPurchaseChannel[];
}

function getPurchaseLabel(channel: PublicPurchaseChannel, marketName: string | null) {
  if (channel.channel.slug === 'amazon') {
    return 'Comprar en Amazon';
  }

  return marketName ?? `Comprar en ${channel.channel.name}`;
}

export function BookPurchaseSection({ channels }: BookPurchaseSectionProps) {
  const visibleChannels = channels.filter((channel) => channel.options.length > 0);

  if (visibleChannels.length === 0) {
    return null;
  }

  return (
    <PublicSection variant="compact" className="bg-public-surface-subtle">
      <PublicContainer>
        <SectionHeading title="Comprar" variant="compact" />
        <div className="mt-7 grid gap-7 md:grid-cols-2">
          {visibleChannels.map((channel) => (
            <section
              key={channel.channel.slug}
              aria-labelledby={`purchase-channel-${channel.channel.slug}`}
              className="space-y-4 border-t border-public-border pt-4"
            >
              <h3
                id={`purchase-channel-${channel.channel.slug}`}
                className="font-serif-public text-xl text-public-ink"
              >
                {channel.channel.name}
              </h3>
              <ul className="flex flex-wrap gap-3">
                {channel.options.map((option) => (
                  <li key={`${option.countryCode ?? 'direct'}-${option.url}`}>
                    <a
                      href={option.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-public-red bg-white px-4 py-2.5 text-sm font-semibold text-public-ink transition hover:bg-public-red hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2 focus-visible:ring-offset-public-surface-subtle"
                    >
                      {getPurchaseLabel(channel, option.marketName)}
                      <ExternalLink className="size-4" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </PublicContainer>
    </PublicSection>
  );
}
