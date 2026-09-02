import { SALES_PRODUCT_EXTERNAL_ID_PLACEHOLDER } from '@/services/sales/purchase-url-resolver';

export interface InitialSalesChannelConfig {
  name: string;
  slug: string;
  websiteUrl: string;
  isActive: boolean;
  sortOrder: number;
}

export interface InitialSalesMarketConfig {
  name: string;
  countryCode: string;
  baseUrl: string;
  productUrlTemplate: string;
  isActive: boolean;
  sortOrder: number;
}

export interface InitialSalesChannelWithMarketsConfig {
  channel: InitialSalesChannelConfig;
  markets: InitialSalesMarketConfig[];
}

function createQuaresTemplate(baseUrl: string): string {
  return `${baseUrl}/q/detalle?p2_id=${SALES_PRODUCT_EXTERNAL_ID_PLACEHOLDER}`;
}

const quaresMarkets = [
  ['España', 'ES', 'https://tienda.editoriallarueca.com', 0],
  ['Argentina', 'AR', 'https://argentina.editoriallarueca.com', 10],
  ['Bolivia', 'BO', 'https://bolivia.editoriallarueca.com', 20],
  ['Chile', 'CL', 'https://chile.editoriallarueca.com', 30],
  ['Colombia', 'CO', 'https://colombia.editoriallarueca.com', 40],
  ['Costa Rica', 'CR', 'https://costarica.editoriallarueca.com', 50],
  ['Ecuador', 'EC', 'https://ecuador.editoriallarueca.com', 60],
  ['Guatemala', 'GT', 'https://guatemala.editoriallarueca.com', 70],
  ['México', 'MX', 'https://mexico.editoriallarueca.com', 80],
  ['USA', 'US', 'https://usa.editoriallarueca.com', 90],
  ['Venezuela', 'VE', 'https://venezuela.editoriallarueca.com', 100],
] as const;

export const initialSalesChannels = [
  {
    channel: {
      name: 'Quares',
      slug: 'quares',
      websiteUrl: 'https://tienda.editoriallarueca.com',
      isActive: true,
      sortOrder: 0,
    },
    markets: quaresMarkets.map(([name, countryCode, baseUrl, sortOrder]) => ({
      name,
      countryCode,
      baseUrl,
      productUrlTemplate: createQuaresTemplate(baseUrl),
      isActive: true,
      sortOrder,
    })),
  },
  {
    channel: {
      name: 'Amazon',
      slug: 'amazon',
      websiteUrl: 'https://www.amazon.es',
      isActive: true,
      sortOrder: 10,
    },
    markets: [],
  },
] satisfies InitialSalesChannelWithMarketsConfig[];
