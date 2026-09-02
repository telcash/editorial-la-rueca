import type { SalesChannel, SalesChannelMarket } from '@/db/schema';
import { salesChannelMarketSchema, salesChannelSchema } from '@/schemas/sales/sales.schema';
import type {
  InitialSalesChannelWithMarketsConfig,
  InitialSalesMarketConfig,
} from './initial-sales-config';
import type {
  SalesSeedChannelPlanItem,
  SalesSeedMarketPlanItem,
  SalesSeedMode,
  SalesSeedOperation,
  SalesSeedPlan,
  SalesSeedPlanSummary,
} from './types';

function hasTextChanged(current: string | null, expected: string | null): boolean {
  return current !== expected;
}

function hasBooleanChanged(current: boolean, expected: boolean): boolean {
  return current !== expected;
}

function hasNumberChanged(current: number, expected: number): boolean {
  return current !== expected;
}

function getChannelOperation(
  existing: SalesChannel | null,
  expectedName: string,
  hasChanges: boolean,
): SalesSeedOperation {
  if (!existing) {
    return 'create';
  }

  if (existing.name.trim().toLowerCase() !== expectedName.trim().toLowerCase()) {
    return 'conflict';
  }

  return hasChanges ? 'update' : 'unchanged';
}

function getMarketOperation(
  existing: SalesChannelMarket | null,
  expectedName: string,
  hasChanges: boolean,
): SalesSeedOperation {
  if (!existing) {
    return 'create';
  }

  if (existing.name.trim().toLowerCase() !== expectedName.trim().toLowerCase()) {
    return 'conflict';
  }

  return hasChanges ? 'update' : 'unchanged';
}

function validateInitialSalesConfig(config: InitialSalesChannelWithMarketsConfig[]) {
  const channelSlugs = new Set<string>();

  for (const entry of config) {
    const channel = salesChannelSchema.parse(entry.channel);

    if (channelSlugs.has(channel.slug)) {
      throw new Error(`Configuración inválida: canal duplicado "${channel.slug}".`);
    }

    channelSlugs.add(channel.slug);

    const countryCodes = new Set<string>();

    for (const market of entry.markets) {
      salesChannelMarketSchema.omit({ salesChannelId: true }).parse(market);

      if (countryCodes.has(market.countryCode)) {
        throw new Error(
          `Configuración inválida: countryCode duplicado "${market.countryCode}" en ${channel.slug}.`,
        );
      }

      countryCodes.add(market.countryCode);
    }
  }
}

function indexMarketsByCountryCode(markets: SalesChannelMarket[]) {
  const marketsByCountryCode = new Map<string, SalesChannelMarket>();

  for (const market of markets) {
    if (!market.countryCode) {
      continue;
    }

    marketsByCountryCode.set(market.countryCode, market);
  }

  return marketsByCountryCode;
}

function planChannel(
  expected: InitialSalesChannelWithMarketsConfig['channel'],
  existing: SalesChannel | null,
): SalesSeedChannelPlanItem {
  const reasons: string[] = [];

  if (!existing) {
    reasons.push('No existe un canal con este slug.');
    return {
      type: 'channel',
      slug: expected.slug,
      expected,
      existing,
      operation: 'create',
      reasons,
    };
  }

  if (hasTextChanged(existing.name, expected.name)) {
    reasons.push(`Nombre actual "${existing.name}" distinto de "${expected.name}".`);
  }

  if (hasTextChanged(existing.websiteUrl, expected.websiteUrl)) {
    reasons.push('Website URL distinta.');
  }

  if (hasBooleanChanged(existing.isActive, expected.isActive)) {
    reasons.push('Estado activo distinto.');
  }

  if (hasNumberChanged(existing.sortOrder, expected.sortOrder)) {
    reasons.push('Orden distinto.');
  }

  const hasChanges = reasons.length > 0;
  const operation = getChannelOperation(existing, expected.name, hasChanges);

  if (operation === 'conflict') {
    reasons.push('El slug existe pero no parece representar el canal esperado.');
  }

  return {
    type: 'channel',
    slug: expected.slug,
    expected,
    existing,
    operation,
    reasons: reasons.length > 0 ? reasons : ['La configuración coincide.'],
  };
}

function planMarket(
  channelSlug: string,
  expected: InitialSalesMarketConfig,
  existing: SalesChannelMarket | null,
): SalesSeedMarketPlanItem {
  const reasons: string[] = [];

  if (!existing) {
    reasons.push('No existe un market con este countryCode para el canal.');
    return {
      type: 'market',
      channelSlug,
      countryCode: expected.countryCode,
      expected,
      existing,
      operation: 'create',
      reasons,
    };
  }

  if (hasTextChanged(existing.name, expected.name)) {
    reasons.push(`Nombre actual "${existing.name}" distinto de "${expected.name}".`);
  }

  if (hasTextChanged(existing.baseUrl, expected.baseUrl)) {
    reasons.push('Base URL distinta.');
  }

  if (hasTextChanged(existing.productUrlTemplate, expected.productUrlTemplate)) {
    reasons.push('Product URL template distinta.');
  }

  if (hasBooleanChanged(existing.isActive, expected.isActive)) {
    reasons.push('Estado activo distinto.');
  }

  if (hasNumberChanged(existing.sortOrder, expected.sortOrder)) {
    reasons.push('Orden distinto.');
  }

  const hasChanges = reasons.length > 0;
  const operation = getMarketOperation(existing, expected.name, hasChanges);

  if (operation === 'conflict') {
    reasons.push(
      'El countryCode existe en el canal pero no parece representar el market esperado.',
    );
  }

  return {
    type: 'market',
    channelSlug,
    countryCode: expected.countryCode,
    expected,
    existing,
    operation,
    reasons: reasons.length > 0 ? reasons : ['La configuración coincide.'],
  };
}

function summarize(
  channels: SalesSeedChannelPlanItem[],
  markets: SalesSeedMarketPlanItem[],
): SalesSeedPlanSummary {
  return {
    channelsCreate: channels.filter((item) => item.operation === 'create').length,
    channelsUpdate: channels.filter((item) => item.operation === 'update').length,
    channelsUnchanged: channels.filter((item) => item.operation === 'unchanged').length,
    channelsConflict: channels.filter((item) => item.operation === 'conflict').length,
    marketsCreate: markets.filter((item) => item.operation === 'create').length,
    marketsUpdate: markets.filter((item) => item.operation === 'update').length,
    marketsUnchanged: markets.filter((item) => item.operation === 'unchanged').length,
    marketsConflict: markets.filter((item) => item.operation === 'conflict').length,
    conflicts:
      channels.filter((item) => item.operation === 'conflict').length +
      markets.filter((item) => item.operation === 'conflict').length,
  };
}

export interface PlanInitialSalesSeedInput {
  config: InitialSalesChannelWithMarketsConfig[];
  existingChannelsBySlug: Map<string, SalesChannel>;
  existingMarketsByChannelSlug: Map<string, SalesChannelMarket[]>;
  mode: SalesSeedMode;
}

export function planInitialSalesSeed({
  config,
  existingChannelsBySlug,
  existingMarketsByChannelSlug,
  mode,
}: PlanInitialSalesSeedInput): SalesSeedPlan {
  validateInitialSalesConfig(config);

  const channels: SalesSeedChannelPlanItem[] = [];
  const markets: SalesSeedMarketPlanItem[] = [];

  for (const entry of config) {
    const channelPlan = planChannel(
      entry.channel,
      existingChannelsBySlug.get(entry.channel.slug) ?? null,
    );
    channels.push(channelPlan);

    const existingMarketsByCountryCode = indexMarketsByCountryCode(
      existingMarketsByChannelSlug.get(entry.channel.slug) ?? [],
    );

    for (const market of entry.markets) {
      markets.push(
        planMarket(
          entry.channel.slug,
          market,
          existingMarketsByCountryCode.get(market.countryCode) ?? null,
        ),
      );
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    mode,
    channels,
    markets,
    summary: summarize(channels, markets),
  };
}
