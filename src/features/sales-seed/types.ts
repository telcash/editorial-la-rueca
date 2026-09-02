import type { SalesChannel, SalesChannelMarket } from '@/db/schema';
import type { InitialSalesChannelConfig, InitialSalesMarketConfig } from './initial-sales-config';

export type SalesSeedMode = 'dry-run' | 'apply';
export type SalesSeedOperation = 'create' | 'update' | 'unchanged' | 'conflict';

export interface SalesSeedChannelPlanItem {
  type: 'channel';
  slug: string;
  expected: InitialSalesChannelConfig;
  existing: SalesChannel | null;
  operation: SalesSeedOperation;
  reasons: string[];
}

export interface SalesSeedMarketPlanItem {
  type: 'market';
  channelSlug: string;
  countryCode: string;
  expected: InitialSalesMarketConfig;
  existing: SalesChannelMarket | null;
  operation: SalesSeedOperation;
  reasons: string[];
}

export interface SalesSeedPlanSummary {
  channelsCreate: number;
  channelsUpdate: number;
  channelsUnchanged: number;
  channelsConflict: number;
  marketsCreate: number;
  marketsUpdate: number;
  marketsUnchanged: number;
  marketsConflict: number;
  conflicts: number;
}

export interface SalesSeedPlan {
  generatedAt: string;
  mode: SalesSeedMode;
  channels: SalesSeedChannelPlanItem[];
  markets: SalesSeedMarketPlanItem[];
  summary: SalesSeedPlanSummary;
}

export interface SalesSeedApplyResult {
  channelsCreated: number;
  channelsUpdated: number;
  channelsUnchanged: number;
  marketsCreated: number;
  marketsUpdated: number;
  marketsUnchanged: number;
}

export interface SalesSeedRepository {
  findChannelBySlug(slug: string): Promise<SalesChannel | null>;
  findMarketsByChannelId(salesChannelId: string): Promise<SalesChannelMarket[]>;
  applyInitialSalesConfiguration(
    plan: Pick<SalesSeedPlan, 'channels' | 'markets'>,
  ): Promise<SalesSeedApplyResult>;
}
