'use client';

import { ChevronDown, ExternalLink } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PublicSalesChannelMarket } from '@/services/sales/sales.types';

interface PublicStoreDropdownProps {
  markets: PublicSalesChannelMarket[];
}

export function PublicStoreDropdown({ markets }: PublicStoreDropdownProps) {
  if (markets.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium text-public-ink transition hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
        >
          Tienda
          <ChevronDown className="size-4" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={10}
        aria-label="Tiendas Quares por país"
        className="min-w-52 rounded-md border border-public-border bg-white p-1.5 text-public-ink shadow-public-elevated"
      >
        {markets.map((market) => (
          <DropdownMenuItem key={`${market.countryCode ?? 'market'}-${market.name}`} asChild>
            <a
              href={market.baseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-10 cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm font-medium focus:bg-public-red-soft focus:text-public-red"
            >
              {market.name}
              <ExternalLink className="size-3.5 text-public-muted" aria-hidden="true" />
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
