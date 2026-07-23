import { decodeXmlEntities } from './normalize';
import type { WordPressChannel, WordPressItem, WordPressMeta, WordPressTerm } from './types';

export function parseWxr(xml: string): WordPressChannel {
  return {
    wxrVersion: getTagValue(xml, 'wp:wxr_version'),
    siteUrl: getTagValue(xml, 'link'),
    items: getBlocks(xml, 'item').map(parseItem),
  };
}

function parseItem(itemXml: string): WordPressItem {
  return {
    wpPostId: getTagValue(itemXml, 'wp:post_id'),
    title: getTagValue(itemXml, 'title'),
    slug: getTagValue(itemXml, 'wp:post_name'),
    status: getTagValue(itemXml, 'wp:status'),
    postType: getTagValue(itemXml, 'wp:post_type'),
    oldUrl: getTagValue(itemXml, 'link'),
    createdAt: getTagValue(itemXml, 'wp:post_date_gmt') || getTagValue(itemXml, 'wp:post_date'),
    modifiedAt:
      getTagValue(itemXml, 'wp:post_modified_gmt') || getTagValue(itemXml, 'wp:post_modified'),
    content: getTagValue(itemXml, 'content:encoded'),
    excerpt: getTagValue(itemXml, 'excerpt:encoded'),
    guid: getTagValue(itemXml, 'guid'),
    metas: getBlocks(itemXml, 'wp:postmeta').map(parseMeta),
    terms: parseTerms(itemXml),
  };
}

function parseMeta(metaXml: string): WordPressMeta {
  return {
    key: getTagValue(metaXml, 'wp:meta_key'),
    value: getTagValue(metaXml, 'wp:meta_value'),
  };
}

function parseTerms(itemXml: string): WordPressTerm[] {
  const termPattern = /<category\b([^>]*)>([\s\S]*?)<\/category>/gu;
  const terms: WordPressTerm[] = [];
  let match: RegExpExecArray | null;

  while ((match = termPattern.exec(itemXml)) !== null) {
    const attributes = match[1] ?? '';
    terms.push({
      domain: getAttribute(attributes, 'domain'),
      nicename: getAttribute(attributes, 'nicename'),
      name: unwrapXmlValue(match[2] ?? ''),
    });
  }

  return terms;
}

function getBlocks(xml: string, tagName: string) {
  const pattern = new RegExp(
    `<${escapeRegExp(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tagName)}>`,
    'gu',
  );
  const blocks: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(xml)) !== null) {
    blocks.push(match[1] ?? '');
  }

  return blocks;
}

function getTagValue(xml: string, tagName: string) {
  const pattern = new RegExp(
    `<${escapeRegExp(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tagName)}>`,
    'u',
  );
  const match = pattern.exec(xml);

  return match ? unwrapXmlValue(match[1] ?? '') : '';
}

function unwrapXmlValue(value: string) {
  const trimmed = value.trim();
  const cdataMatch = /^<!\[CDATA\[([\s\S]*)\]\]>$/u.exec(trimmed);

  return decodeXmlEntities(cdataMatch ? cdataMatch[1] : trimmed);
}

function getAttribute(attributes: string, name: string) {
  const pattern = new RegExp(`${name}="([^"]*)"`, 'u');
  const match = pattern.exec(attributes);

  return match ? decodeXmlEntities(match[1] ?? '') : '';
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
