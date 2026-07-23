import { describe, expect, it } from 'vitest';

import { toCsv } from './csv';
import { auditWordPressExport } from './audit';

const fixtureXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:wp="http://wordpress.org/export/1.2/">
<channel>
  <link>https://editorial.test</link>
  <wp:wxr_version>1.2</wp:wxr_version>
  <item>
    <title><![CDATA[Imagen de Ana]]></title>
    <link>https://editorial.test/wp-content/uploads/ana.jpg</link>
    <guid>https://editorial.test/wp-content/uploads/ana.jpg</guid>
    <wp:post_id>10</wp:post_id>
    <wp:post_name>ana-jpg</wp:post_name>
    <wp:status>inherit</wp:status>
    <wp:post_type>attachment</wp:post_type>
    <wp:postmeta><wp:meta_key>_wp_attached_file</wp:meta_key><wp:meta_value><![CDATA[2024/ana.jpg]]></wp:meta_value></wp:postmeta>
    <wp:postmeta><wp:meta_key>_wp_attachment_metadata</wp:meta_key><wp:meta_value><![CDATA[a:2:{s:5:"width";i:800;s:6:"height";i:600;}]]></wp:meta_value></wp:postmeta>
  </item>
  <item>
    <title><![CDATA[Portada distinta]]></title>
    <link>https://editorial.test/wp-content/uploads/portada.png</link>
    <guid>https://editorial.test/wp-content/uploads/portada.png</guid>
    <wp:post_id>11</wp:post_id>
    <wp:post_name>portada-png</wp:post_name>
    <wp:status>inherit</wp:status>
    <wp:post_type>attachment</wp:post_type>
  </item>
  <item>
    <title><![CDATA[Ana Autora]]></title>
    <link>https://editorial.test/autor/ana-autora/</link>
    <wp:post_id>1</wp:post_id>
    <wp:post_name>ana-autora</wp:post_name>
    <wp:status>publish</wp:status>
    <wp:post_date_gmt>2024-01-01 00:00:00</wp:post_date_gmt>
    <wp:post_modified_gmt>2024-02-01 00:00:00</wp:post_modified_gmt>
    <wp:post_type>autor</wp:post_type>
    <category domain="category" nicename="amazon"><![CDATA[Amazon]]></category>
    <wp:postmeta><wp:meta_key>tf_libro</wp:meta_key><wp:meta_value><![CDATA[Cruce de Pasos]]></wp:meta_value></wp:postmeta>
    <wp:postmeta><wp:meta_key>tf_video</wp:meta_key><wp:meta_value><![CDATA[abc123]]></wp:meta_value></wp:postmeta>
    <wp:postmeta><wp:meta_key>ta_resena</wp:meta_key><wp:meta_value><![CDATA[<p>Sinopsis <strong>con HTML</strong></p>]]></wp:meta_value></wp:postmeta>
    <wp:postmeta><wp:meta_key>_thumbnail_id</wp:meta_key><wp:meta_value>10</wp:meta_value></wp:postmeta>
    <wp:postmeta><wp:meta_key>imagen_destacada_2</wp:meta_key><wp:meta_value>11</wp:meta_value></wp:postmeta>
    <wp:postmeta><wp:meta_key>_yoast_wpseo_metadesc</wp:meta_key><wp:meta_value><![CDATA[Descripción SEO]]></wp:meta_value></wp:postmeta>
  </item>
  <item>
    <title><![CDATA[Bea Escritora]]></title>
    <link>https://editorial.test/autor/bea-escritora/</link>
    <wp:post_id>2</wp:post_id>
    <wp:post_name>bea-escritora</wp:post_name>
    <wp:status>publish</wp:status>
    <wp:post_type>autor</wp:post_type>
    <wp:postmeta><wp:meta_key>tf_libro</wp:meta_key><wp:meta_value><![CDATA[Cruce de pasos]]></wp:meta_value></wp:postmeta>
    <wp:postmeta><wp:meta_key>ta_resena</wp:meta_key><wp:meta_value><![CDATA[Otra sinopsis]]></wp:meta_value></wp:postmeta>
    <wp:postmeta><wp:meta_key>_thumbnail_id</wp:meta_key><wp:meta_value>999</wp:meta_value></wp:postmeta>
  </item>
  <item>
    <title><![CDATA[Carmen Moderna]]></title>
    <link>https://editorial.test/autor/carmen-moderna/</link>
    <wp:post_id>3</wp:post_id>
    <wp:post_name>carmen-moderna</wp:post_name>
    <wp:status>publish</wp:status>
    <wp:post_type>autor</wp:post_type>
    <wp:postmeta><wp:meta_key>ta_resena</wp:meta_key><wp:meta_value><![CDATA[<p>Biografía moderna</p>]]></wp:meta_value></wp:postmeta>
  </item>
  <item>
    <title><![CDATA[Carmen Moderna]]></title>
    <link>https://editorial.test/autor/carmen-moderna-2/</link>
    <wp:post_id>4</wp:post_id>
    <wp:post_name>carmen-moderna-2</wp:post_name>
    <wp:status>draft</wp:status>
    <wp:post_type>autor</wp:post_type>
  </item>
  <item>
    <title><![CDATA[tf_isbn]]></title>
    <wp:post_id>50</wp:post_id>
    <wp:post_name>field_abc</wp:post_name>
    <wp:post_type>acf-field</wp:post_type>
    <wp:post_status>publish</wp:post_status>
    <wp:post_date_gmt>2024-01-01 00:00:00</wp:post_date_gmt>
    <wp:post_modified_gmt>2024-01-01 00:00:00</wp:post_modified_gmt>
    <excerpt:encoded><![CDATA[tf_isbn]]></excerpt:encoded>
    <content:encoded><![CDATA[a:2:{s:4:"type";s:4:"text";s:13:"default_value";s:0:"";}]]></content:encoded>
  </item>
  <item>
    <title><![CDATA[Producto de prueba]]></title>
    <link>https://editorial.test/product/producto-prueba/</link>
    <wp:post_id>60</wp:post_id>
    <wp:post_name>producto-prueba</wp:post_name>
    <wp:status>publish</wp:status>
    <wp:post_type>product</wp:post_type>
    <category domain="product_type" nicename="external"><![CDATA[external]]></category>
    <wp:postmeta><wp:meta_key>_sku</wp:meta_key><wp:meta_value>SKU-1</wp:meta_value></wp:postmeta>
    <wp:postmeta><wp:meta_key>_price</wp:meta_key><wp:meta_value>12.00</wp:meta_value></wp:postmeta>
    <wp:postmeta><wp:meta_key>_product_url</wp:meta_key><wp:meta_value>https://tienda.test</wp:meta_value></wp:postmeta>
  </item>
</channel>
</rss>`;

describe('auditWordPressExport', () => {
  const result = auditWordPressExport(fixtureXml, './fixture.xml', Buffer.byteLength(fixtureXml));

  it('parses author records and legacy tf_libro book candidates', () => {
    expect(result.report.totalAutoresCpt).toBe(4);
    expect(result.authors[0]).toMatchObject({
      name: 'Ana Autora',
      classification: 'legacy_author_book_combined',
      reviewLikelyType: 'book_synopsis',
    });
    expect(result.books[0]).toMatchObject({
      title: 'Cruce de Pasos',
      videoId: 'abc123',
    });
  });

  it('detects duplicated normalized book titles and relationships', () => {
    expect(result.report.statistics.uniqueBookCandidates).toBe(1);
    expect(result.report.statistics.duplicatedBookTitles).toBe(1);
    expect(result.relationships).toHaveLength(2);
    expect(result.issues.some((issue) => issue.code === 'DUPLICATE_BOOK_TITLE')).toBe(true);
  });

  it('resolves attachments and reports missing or ambiguous image references', () => {
    expect(result.attachments[0]).toMatchObject({
      wpPostId: '10',
      mimeType: 'image/jpeg',
      width: '800',
      height: '600',
    });
    expect(result.authors[0]?.thumbnailUrl).toContain('ana.jpg');
    expect(result.issues.some((issue) => issue.code === 'MISSING_IMAGE_ATTACHMENT')).toBe(true);
    expect(result.issues.some((issue) => issue.code === 'AMBIGUOUS_AUTHOR_BOOK_IMAGE')).toBe(true);
  });

  it('classifies modern authors and possible duplicates', () => {
    expect(result.authors[2]?.classification).toBe('author_only_candidate');
    expect(result.authors[2]?.reviewLikelyType).toBe('author_bio');
    expect(result.issues.some((issue) => issue.code === 'POSSIBLE_DUPLICATE_AUTHOR')).toBe(true);
  });

  it('detects ACF book fields and absence of real book posts', () => {
    expect(result.report.acfBookFieldsDetected).toEqual([
      {
        fieldName: 'tf_isbn',
        fieldKey: 'field_abc',
        fieldType: 'text',
        defaultValue: '',
      },
    ]);
    expect(result.report.totalLibrosCpt).toBe(0);
    expect(result.report.warnings).toContain('NO_ACTUAL_BOOK_POSTS_FOUND');
  });

  it('separates plugin taxonomies and categories not suitable for automatic migration', () => {
    expect(result.report.taxonomiesDetected.pluginOrSystem[0]).toMatchObject({
      taxonomy: 'product_type',
    });
    expect(
      result.report.taxonomiesDetected.notSuitableForAutomaticCategoryMigration[0],
    ).toMatchObject({
      term: 'Amazon',
    });
  });

  it('preserves HTML raw review while generating a plain text preview', () => {
    expect(result.authors[0]?.rawReview).toContain('<strong>con HTML</strong>');
    expect(result.authors[0]?.plainTextPreview).toBe('Sinopsis con HTML');
  });

  it('generates CSV with escaped values', () => {
    expect(toCsv([{ title: 'Uno, dos', count: 2 }], ['title', 'count'])).toBe(
      'title,count\n"Uno, dos",2',
    );
  });
});
