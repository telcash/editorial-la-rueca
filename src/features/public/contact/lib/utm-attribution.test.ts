import { describe, expect, it } from 'vitest';

import {
  clearPublicContactUtmAttribution,
  getPublicContactUtmValuesFromSearchParams,
  normalizePublicContactUtmValues,
  PUBLIC_UTM_ATTRIBUTION_STORAGE_KEY,
  readPublicContactUtmAttribution,
  writePublicContactUtmAttribution,
} from './utm-attribution';

function createStorage() {
  const values = new Map<string, string>();

  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe('public UTM attribution', () => {
  it('extracts and trims a complete URL snapshot', () => {
    expect(
      getPublicContactUtmValuesFromSearchParams(
        new URLSearchParams(
          'utm_source=instagram&utm_medium=social&utm_campaign=manuscrito_cajon&utm_content=reel_01',
        ),
      ),
    ).toEqual({
      utmSource: 'instagram',
      utmMedium: 'social',
      utmCampaign: 'manuscrito_cajon',
      utmContent: 'reel_01',
      utmTerm: '',
    });
  });

  it('uses the database-aligned limits for every UTM field', () => {
    const makeValue = (length: number) => 'x'.repeat(length);
    const valid = normalizePublicContactUtmValues({
      utmSource: makeValue(160),
      utmMedium: makeValue(160),
      utmCampaign: makeValue(180),
      utmContent: makeValue(180),
      utmTerm: makeValue(180),
    });

    expect(valid.utmSource).toHaveLength(160);
    expect(valid.utmMedium).toHaveLength(160);
    expect(valid.utmCampaign).toHaveLength(180);
    expect(valid.utmContent).toHaveLength(180);
    expect(valid.utmTerm).toHaveLength(180);
    expect(
      normalizePublicContactUtmValues({
        utmSource: makeValue(161),
        utmMedium: makeValue(161),
        utmCampaign: makeValue(181),
        utmContent: makeValue(181),
        utmTerm: makeValue(181),
      }),
    ).toEqual({ utmSource: '', utmMedium: '', utmCampaign: '', utmContent: '', utmTerm: '' });
  });

  it('writes and restores a versioned snapshot without mixing campaigns', () => {
    const storage = createStorage();
    const campaignA = {
      utmSource: 'instagram',
      utmMedium: 'social',
      utmCampaign: 'campaign-a',
      utmContent: 'reel-a',
      utmTerm: '',
    };
    const campaignB = {
      utmSource: 'facebook',
      utmMedium: 'social',
      utmCampaign: 'campaign-b',
      utmContent: '',
      utmTerm: '',
    };

    writePublicContactUtmAttribution(storage, campaignA);
    writePublicContactUtmAttribution(storage, campaignB);

    expect(readPublicContactUtmAttribution(storage)).toEqual(campaignB);
    expect(storage.values.get(PUBLIC_UTM_ATTRIBUTION_STORAGE_KEY)).not.toContain('reel-a');
  });

  it('clears the snapshot on revocation and ignores malformed data', () => {
    const storage = createStorage();
    storage.setItem(PUBLIC_UTM_ATTRIBUTION_STORAGE_KEY, '{bad json');
    expect(readPublicContactUtmAttribution(storage)).toBeNull();

    storage.setItem(PUBLIC_UTM_ATTRIBUTION_STORAGE_KEY, JSON.stringify({ version: 1 }));
    clearPublicContactUtmAttribution(storage);
    expect(readPublicContactUtmAttribution(storage)).toBeNull();
  });
});
