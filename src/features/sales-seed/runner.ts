import type { SalesChannel } from '@/db/schema';
import { initialSalesChannels } from './initial-sales-config';
import { assertSalesSeedApplyConfirmation } from './confirmation';
import { planInitialSalesSeed } from './planner';
import type {
  SalesSeedApplyResult,
  SalesSeedMode,
  SalesSeedPlan,
  SalesSeedRepository,
} from './types';

export interface RunSalesSeedOptions {
  mode: SalesSeedMode;
  confirm?: string;
}

export interface RunSalesSeedResult {
  plan: SalesSeedPlan;
  applyResult: SalesSeedApplyResult | null;
}

const emptyApplyResult: SalesSeedApplyResult = {
  channelsCreated: 0,
  channelsUpdated: 0,
  channelsUnchanged: 0,
  marketsCreated: 0,
  marketsUpdated: 0,
  marketsUnchanged: 0,
};

async function loadCurrentSalesSeedState(repository: SalesSeedRepository) {
  const existingChannelsBySlug = new Map<string, SalesChannel>();
  const existingMarketsByChannelSlug = new Map<
    string,
    Awaited<ReturnType<SalesSeedRepository['findMarketsByChannelId']>>
  >();

  for (const { channel } of initialSalesChannels) {
    const existingChannel = await repository.findChannelBySlug(channel.slug);

    if (existingChannel) {
      existingChannelsBySlug.set(channel.slug, existingChannel);
    }

    existingMarketsByChannelSlug.set(
      channel.slug,
      existingChannel ? await repository.findMarketsByChannelId(existingChannel.id) : [],
    );
  }

  return {
    existingChannelsBySlug,
    existingMarketsByChannelSlug,
  };
}

export async function runSalesSeed(
  repository: SalesSeedRepository,
  { mode, confirm }: RunSalesSeedOptions,
): Promise<RunSalesSeedResult> {
  if (mode === 'apply') {
    assertSalesSeedApplyConfirmation(confirm);
  }

  const { existingChannelsBySlug, existingMarketsByChannelSlug } =
    await loadCurrentSalesSeedState(repository);
  const plan = planInitialSalesSeed({
    config: initialSalesChannels,
    existingChannelsBySlug,
    existingMarketsByChannelSlug,
    mode,
  });

  if (mode === 'dry-run') {
    return {
      plan,
      applyResult: null,
    };
  }

  if (plan.summary.conflicts > 0) {
    throw new Error(`Sales seed bloqueado por ${plan.summary.conflicts} conflicto(s).`);
  }

  const applyResult = await repository.applyInitialSalesConfiguration(plan);

  return {
    plan,
    applyResult: applyResult ?? emptyApplyResult,
  };
}
