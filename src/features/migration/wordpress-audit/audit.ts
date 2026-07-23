import {
  normalizeName,
  normalizeSlugComparison,
  normalizeTitle,
  stripHtmlForPreview,
} from './normalize';
import { parseWxr } from './parser';
import type {
  AcfBookField,
  AttachmentCandidate,
  AuditResult,
  AuthorCandidate,
  AuthorClassification,
  BookCandidate,
  Issue,
  MigrationReport,
  ModelGapField,
  RelationshipCandidate,
  ReviewLikelyType,
  WooCommerceProduct,
  WordPressItem,
  WordPressMeta,
  WordPressTerm,
} from './types';

const AUTHOR_POST_TYPE = 'autor';
const BOOK_POST_TYPE = 'libro';
const ATTACHMENT_POST_TYPE = 'attachment';
const PAGE_POST_TYPE = 'page';
const PRODUCT_POST_TYPE = 'product';
const ACF_FIELD_POST_TYPE = 'acf-field';

const BOOK_FIELD_NAMES = [
  'tf_autor',
  'tf_genero',
  'tf_fecha_publicacion',
  'tf_n_paginas',
  'tf_idioma',
  'tf_encuadernacion',
  'tf_isbn',
  'tf_fecha_edicion',
  'tf_alto',
  'tf_ancho',
  'tf_peso',
  'tf_pvp',
  'ta_sinopsis',
  'tf_link_compra_1',
];

const PLUGIN_OR_SYSTEM_TAXONOMIES = new Set([
  'product_visibility',
  'product_type',
  'layout_type',
  'flamingo_inbound_channel',
  'nav_menu',
  'wp_theme',
  'wp_template_part_area',
  'translation_priority',
  'module_width',
  'scope',
]);

const NOT_SUITABLE_CATEGORY_TERMS = new Set(['amazon', 'uncategorized', 'sin categorizar']);

export function auditWordPressExport(
  xml: string,
  sourceFile: string,
  sourceSizeBytes: number,
): AuditResult {
  const channel = parseWxr(xml);
  const issues: Issue[] = [];
  const countsByPostType = countBy(channel.items, (item) => item.postType || 'unknown');
  const countsByStatus = countBy(channel.items, (item) => item.status || 'unknown');
  const attachments = buildAttachmentCandidates(channel.items);
  const attachmentsById = new Map(
    attachments.map((attachment) => [attachment.wpPostId, attachment]),
  );
  const authorItems = channel.items.filter((item) => item.postType === AUTHOR_POST_TYPE);
  const bookPostItems = channel.items.filter((item) => item.postType === BOOK_POST_TYPE);
  const productItems = channel.items.filter((item) => item.postType === PRODUCT_POST_TYPE);
  const authors = buildAuthorCandidates(authorItems, attachmentsById, issues);
  const books = buildBookCandidates(authorItems, authors, attachmentsById, issues);
  const relationships = buildRelationshipCandidates(books, authors);
  const taxonomiesDetected = classifyTaxonomies(channel.items.flatMap((item) => item.terms));
  const acfBookFieldsDetected = detectAcfBookFields(channel.items);
  const woocommerceProducts = buildWooCommerceProducts(productItems);

  addDuplicateBookIssues(books, issues);
  addDuplicateAuthorIssues(authors, issues);
  addNoBookPostWarning(bookPostItems, issues);
  addMissingDedicatedBookUrlIssues(books, issues);

  const report: MigrationReport = {
    generatedAt: new Date().toISOString(),
    sourceFile,
    sourceSizeBytes,
    wxrVersion: channel.wxrVersion,
    siteUrl: channel.siteUrl,
    countsByPostType,
    countsByStatus,
    totalAttachments: countsByPostType[ATTACHMENT_POST_TYPE] ?? 0,
    totalAutoresCpt: countsByPostType[AUTHOR_POST_TYPE] ?? 0,
    totalLibrosCpt: countsByPostType[BOOK_POST_TYPE] ?? 0,
    totalPages: countsByPostType[PAGE_POST_TYPE] ?? 0,
    totalWooCommerceProducts: countsByPostType[PRODUCT_POST_TYPE] ?? 0,
    frequentMetaKeysByPostType: getFrequentMetaKeysByPostType(channel.items),
    taxonomiesDetected,
    statistics: buildStatistics(authors, books, attachmentsById),
    acfBookFieldsDetected,
    warnings: bookPostItems.length === 0 ? ['NO_ACTUAL_BOOK_POSTS_FOUND'] : [],
    woocommerceAudit: {
      totalProducts: woocommerceProducts.length,
      products: woocommerceProducts,
    },
  };

  return {
    report,
    authors,
    books,
    relationships,
    attachments,
    issues,
    modelGapAnalysis: buildModelGapAnalysis(),
    postTypes: Object.entries(countsByPostType)
      .map(([postType, count]) => ({ postType, count }))
      .sort(
        (left, right) => right.count - left.count || left.postType.localeCompare(right.postType),
      ),
    pilotSample: buildPilotSample(authors, books),
  };
}

function buildAttachmentCandidates(items: WordPressItem[]): AttachmentCandidate[] {
  return items
    .filter((item) => item.postType === ATTACHMENT_POST_TYPE)
    .map((item) => {
      const metadata = getMetaValue(item.metas, '_wp_attachment_metadata');

      return {
        wpPostId: item.wpPostId,
        title: item.title,
        slug: item.slug,
        url:
          getMetaValue(item.metas, '_wp_attached_url') ||
          getMetaValue(item.metas, 'attachment_url') ||
          item.guid,
        parentId: getMetaValue(item.metas, '_wp_attachment_parent') || '',
        mimeType: inferMimeType(item),
        width: getSerializedValue(metadata, 'width'),
        height: getSerializedValue(metadata, 'height'),
        attachedFile: getMetaValue(item.metas, '_wp_attached_file'),
      };
    });
}

function buildAuthorCandidates(
  authorItems: WordPressItem[],
  attachmentsById: Map<string, AttachmentCandidate>,
  issues: Issue[],
): AuthorCandidate[] {
  const authors = authorItems.map((item) => {
    const tfLibro = getMetaValue(item.metas, 'tf_libro');
    const rawReview = getMetaValue(item.metas, 'ta_resena');
    const thumbnailId = getMetaValue(item.metas, '_thumbnail_id');
    const imageFieldId = getMetaValue(item.metas, 'imagen_destacada_2');
    const thumbnailUrl = resolveAttachmentUrl(thumbnailId, attachmentsById);
    const imageFieldUrl = resolveAttachmentUrl(imageFieldId, attachmentsById);
    const classification = classifyAuthor(item, tfLibro);
    const review = classifyReview(Boolean(tfLibro), rawReview);
    const candidateKey = `author:${item.wpPostId}`;

    if (!item.title.trim()) {
      issues.push(
        makeIssue(
          'error',
          'MISSING_AUTHOR_NAME',
          'author',
          item.wpPostId,
          candidateKey,
          'El autor no tiene nombre.',
          '',
        ),
      );
    }

    if (!item.slug.trim()) {
      issues.push(
        makeIssue(
          'warning',
          'INVALID_OR_EMPTY_SLUG',
          'author',
          item.wpPostId,
          candidateKey,
          'El autor no tiene slug válido.',
          '',
        ),
      );
    }

    addImageIssues(
      item,
      candidateKey,
      thumbnailId,
      thumbnailUrl,
      imageFieldId,
      imageFieldUrl,
      issues,
    );

    if (rawReview && review.reviewLikelyType === 'ambiguous') {
      issues.push(
        makeIssue(
          'info',
          'AMBIGUOUS_REVIEW_ROLE',
          'author',
          item.wpPostId,
          candidateKey,
          'No se puede decidir si ta_resena es biografía o sinopsis.',
          review.reason,
        ),
      );
    }

    return {
      candidateKey,
      sourceWpPostId: item.wpPostId,
      name: item.title,
      normalizedName: normalizeName(item.title),
      slug: item.slug,
      normalizedSlug: normalizeSlugComparison(item.slug),
      oldUrl: item.oldUrl,
      rawReview,
      plainTextPreview: stripHtmlForPreview(rawReview),
      bioCandidate: getMetaValue(item.metas, 'bio_cf'),
      thumbnailId,
      thumbnailUrl,
      imageFieldId,
      imageFieldUrl,
      status: item.status,
      classification: classification.classification,
      classificationReasons: classification.reasons.join('; '),
      possibleDuplicateGroup: '',
      reviewLikelyType: review.reviewLikelyType,
      reviewConfidence: review.confidence,
      yoastMetaTitle: getYoastMetaTitle(item.metas),
      yoastMetaDescription: getYoastMetaDescription(item.metas),
      canonicalUrl: getCanonicalUrl(item.metas),
    };
  });

  assignAuthorDuplicateGroups(authors);

  return authors;
}

function buildBookCandidates(
  authorItems: WordPressItem[],
  authors: AuthorCandidate[],
  attachmentsById: Map<string, AttachmentCandidate>,
  issues: Issue[],
): BookCandidate[] {
  const authorsBySourceId = new Map(authors.map((author) => [author.sourceWpPostId, author]));
  const books = authorItems
    .map((item) => {
      const title = getMetaValue(item.metas, 'tf_libro');

      if (!title.trim()) {
        return null;
      }

      const candidateKey = `book:${normalizeTitle(title) || item.wpPostId}`;
      const rawReview = getMetaValue(item.metas, 'ta_resena');
      const thumbnailId = getMetaValue(item.metas, '_thumbnail_id');
      const author = authorsBySourceId.get(item.wpPostId);

      if (!title.trim()) {
        issues.push(
          makeIssue(
            'error',
            'MISSING_BOOK_TITLE',
            'book',
            item.wpPostId,
            candidateKey,
            'El candidato de libro no tiene título.',
            '',
          ),
        );
      }

      return {
        candidateKey,
        sourceWpPostId: item.wpPostId,
        title,
        normalizedTitle: normalizeTitle(title),
        sourceAuthorTitle: item.title,
        sourceAuthorSlug: item.slug,
        sourceOldUrl: item.oldUrl,
        rawReview,
        plainTextPreview: stripHtmlForPreview(rawReview),
        videoId: getMetaValue(item.metas, 'tf_video'),
        thumbnailId,
        thumbnailUrl: resolveAttachmentUrl(thumbnailId, attachmentsById),
        duplicateGroupId: '',
        authorCandidateKey: author?.candidateKey ?? '',
      };
    })
    .filter((book): book is BookCandidate & { authorCandidateKey: string } => book !== null);

  assignBookDuplicateGroups(books);

  return books;
}

function buildRelationshipCandidates(
  books: Array<BookCandidate & { authorCandidateKey?: string }>,
  authors: AuthorCandidate[],
): RelationshipCandidate[] {
  const authorsBySourceId = new Map(authors.map((author) => [author.sourceWpPostId, author]));

  return books.flatMap((book) => {
    const author = authorsBySourceId.get(book.sourceWpPostId);

    if (!author) {
      return [];
    }

    return [
      {
        bookCandidateKey: book.candidateKey,
        authorCandidateKey: author.candidateKey,
        sourceWpPostId: book.sourceWpPostId,
        confidence: 'high',
        reason: 'Relación inferida desde el registro autor legacy y el campo tf_libro.',
      },
    ];
  });
}

function classifyAuthor(
  item: WordPressItem,
  tfLibro: string,
): { classification: AuthorClassification; reasons: string[] } {
  if (tfLibro.trim()) {
    return {
      classification: 'legacy_author_book_combined',
      reasons: ['tf_libro poblado'],
    };
  }

  const reasons = ['tf_libro vacío'];

  if (item.title.trim() && item.slug.trim()) {
    return {
      classification: 'author_only_candidate',
      reasons,
    };
  }

  return {
    classification: 'ambiguous',
    reasons: [...reasons, 'faltan título o slug'],
  };
}

function classifyReview(
  hasBookTitle: boolean,
  rawReview: string,
): {
  reviewLikelyType: ReviewLikelyType;
  confidence: string;
  reason: string;
} {
  if (!rawReview.trim()) {
    return {
      reviewLikelyType: 'ambiguous',
      confidence: 'low',
      reason: 'ta_resena vacío',
    };
  }

  if (hasBookTitle) {
    return {
      reviewLikelyType: 'book_synopsis',
      confidence: 'medium',
      reason: 'tf_libro existe, ta_resena podría describir el libro',
    };
  }

  return {
    reviewLikelyType: 'author_bio',
    confidence: 'medium',
    reason: 'tf_libro no existe, ta_resena podría describir al autor',
  };
}

function addImageIssues(
  item: WordPressItem,
  candidateKey: string,
  thumbnailId: string,
  thumbnailUrl: string,
  imageFieldId: string,
  imageFieldUrl: string,
  issues: Issue[],
) {
  if (thumbnailId && !thumbnailUrl) {
    issues.push(
      makeIssue(
        'warning',
        'MISSING_IMAGE_ATTACHMENT',
        'author',
        item.wpPostId,
        candidateKey,
        '_thumbnail_id no resuelve a attachment.',
        thumbnailId,
      ),
    );
  }

  if (imageFieldId && !imageFieldUrl) {
    issues.push(
      makeIssue(
        'warning',
        'MISSING_IMAGE_ATTACHMENT',
        'author',
        item.wpPostId,
        candidateKey,
        'imagen_destacada_2 no resuelve a attachment.',
        imageFieldId,
      ),
    );
  }

  if (thumbnailId && imageFieldId && thumbnailId !== imageFieldId) {
    issues.push(
      makeIssue(
        'warning',
        'AMBIGUOUS_IMAGE_ROLE',
        'author',
        item.wpPostId,
        candidateKey,
        'El registro tiene _thumbnail_id e imagen_destacada_2 diferentes.',
        JSON.stringify({ thumbnailId, imageFieldId }),
      ),
    );
    issues.push(
      makeIssue(
        'warning',
        'AMBIGUOUS_AUTHOR_BOOK_IMAGE',
        'author',
        item.wpPostId,
        candidateKey,
        'No se puede decidir automáticamente si las imágenes pertenecen al autor o al libro.',
        JSON.stringify({ thumbnailUrl, imageFieldUrl }),
      ),
    );
  }
}

function assignBookDuplicateGroups(books: BookCandidate[]) {
  const groups = groupBy(books, (book) => book.normalizedTitle);

  for (const [normalizedTitle, group] of groups) {
    if (normalizedTitle && group.length > 1) {
      const groupId = `duplicate-book:${normalizedTitle}`;
      for (const book of group) {
        book.duplicateGroupId = groupId;
      }
    }
  }
}

function assignAuthorDuplicateGroups(authors: AuthorCandidate[]) {
  const groups = new Map<string, AuthorCandidate[]>();

  for (const author of authors) {
    const keys = new Set([author.normalizedName, author.normalizedSlug].filter(Boolean));

    for (const key of keys) {
      const current = groups.get(key) ?? [];
      current.push(author);
      groups.set(key, current);
    }
  }

  for (const [key, group] of groups) {
    if (group.length > 1) {
      const groupId = `possible-author:${key}`;
      for (const author of group) {
        author.possibleDuplicateGroup = author.possibleDuplicateGroup || groupId;
      }
    }
  }
}

function addDuplicateBookIssues(books: BookCandidate[], issues: Issue[]) {
  for (const book of books) {
    if (book.duplicateGroupId) {
      issues.push(
        makeIssue(
          'warning',
          'DUPLICATE_BOOK_TITLE',
          'book',
          book.sourceWpPostId,
          book.candidateKey,
          'Título de libro candidato duplicado normalizado.',
          book.duplicateGroupId,
        ),
      );
    }
  }
}

function addDuplicateAuthorIssues(authors: AuthorCandidate[], issues: Issue[]) {
  for (const author of authors) {
    if (author.possibleDuplicateGroup) {
      issues.push(
        makeIssue(
          'warning',
          'POSSIBLE_DUPLICATE_AUTHOR',
          'author',
          author.sourceWpPostId,
          author.candidateKey,
          'Posible autor duplicado por nombre o slug normalizado.',
          author.possibleDuplicateGroup,
        ),
      );
    }
  }
}

function addNoBookPostWarning(bookPostItems: WordPressItem[], issues: Issue[]) {
  if (bookPostItems.length === 0) {
    issues.push(
      makeIssue(
        'warning',
        'NO_ACTUAL_BOOK_POSTS_FOUND',
        'book',
        '',
        '',
        'No se encontraron registros reales post_type=libro.',
        'Las definiciones ACF no implican datos de libros poblados.',
      ),
    );
  }
}

function addMissingDedicatedBookUrlIssues(books: BookCandidate[], issues: Issue[]) {
  for (const book of books) {
    issues.push(
      makeIssue(
        'info',
        'MISSING_DEDICATED_BOOK_OLD_URL',
        'book',
        book.sourceWpPostId,
        book.candidateKey,
        'El candidato de libro legacy no tiene URL antigua dedicada.',
        book.sourceOldUrl,
      ),
    );
  }
}

function detectAcfBookFields(items: WordPressItem[]): AcfBookField[] {
  return items
    .filter((item) => item.postType === ACF_FIELD_POST_TYPE)
    .map((item) => {
      const fieldName = item.excerpt || getSerializedValue(item.content, 'name') || item.title;
      return {
        fieldName,
        fieldKey: item.slug,
        fieldType: getSerializedValue(item.content, 'type'),
        defaultValue: getSerializedValue(item.content, 'default_value'),
      };
    })
    .filter((field) => BOOK_FIELD_NAMES.includes(field.fieldName));
}

function buildWooCommerceProducts(productItems: WordPressItem[]): WooCommerceProduct[] {
  return productItems.map((item) => ({
    wpPostId: item.wpPostId,
    title: item.title,
    slug: item.slug,
    status: item.status,
    sku: getMetaValue(item.metas, '_sku'),
    price: getMetaValue(item.metas, '_price'),
    regularPrice: getMetaValue(item.metas, '_regular_price'),
    externalUrl: getMetaValue(item.metas, '_product_url'),
    productType: item.terms.find((term) => term.domain === 'product_type')?.name ?? '',
    thumbnailId: getMetaValue(item.metas, '_thumbnail_id'),
  }));
}

function classifyTaxonomies(terms: WordPressTerm[]) {
  const counted = new Map<
    string,
    { taxonomy: string; term: string; slug: string; count: number }
  >();

  for (const term of terms) {
    const key = `${term.domain}:${term.nicename}:${term.name}`;
    const current = counted.get(key);
    counted.set(key, {
      taxonomy: term.domain,
      term: term.name,
      slug: term.nicename,
      count: (current?.count ?? 0) + 1,
    });
  }

  const allTerms = [...counted.values()].sort(
    (left, right) => right.count - left.count || left.taxonomy.localeCompare(right.taxonomy),
  );

  return {
    editorial: allTerms.filter((term) => !PLUGIN_OR_SYSTEM_TAXONOMIES.has(term.taxonomy)),
    pluginOrSystem: allTerms.filter((term) => PLUGIN_OR_SYSTEM_TAXONOMIES.has(term.taxonomy)),
    notSuitableForAutomaticCategoryMigration: allTerms
      .filter((term) => NOT_SUITABLE_CATEGORY_TERMS.has(normalizeTitle(term.term)))
      .map((term) => ({
        taxonomy: term.taxonomy,
        term: term.term,
        slug: term.slug,
        reason: 'Categoría genérica o comercial que requiere revisión manual.',
      })),
  };
}

function getFrequentMetaKeysByPostType(items: WordPressItem[]) {
  const countsByType = new Map<string, Map<string, number>>();

  for (const item of items) {
    const counts = countsByType.get(item.postType) ?? new Map<string, number>();
    for (const meta of item.metas) {
      counts.set(meta.key, (counts.get(meta.key) ?? 0) + 1);
    }
    countsByType.set(item.postType, counts);
  }

  return Object.fromEntries(
    [...countsByType.entries()].map(([postType, counts]) => [
      postType,
      [...counts.entries()]
        .map(([key, count]) => ({ key, count }))
        .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))
        .slice(0, 25),
    ]),
  );
}

function buildStatistics(
  authors: AuthorCandidate[],
  books: BookCandidate[],
  attachmentsById: Map<string, AttachmentCandidate>,
) {
  const authorsWithTfLibro = authors.filter(
    (author) => author.classification === 'legacy_author_book_combined',
  ).length;
  const uniqueBookTitles = new Set(books.map((book) => book.normalizedTitle).filter(Boolean));
  const duplicatedBookTitles = new Set(
    books.filter((book) => book.duplicateGroupId).map((book) => book.duplicateGroupId),
  ).size;
  const imageReferences = authors.flatMap((author) =>
    [author.thumbnailId, author.imageFieldId].filter(Boolean),
  );
  const resolvedAttachmentReferences = imageReferences.filter((id) =>
    attachmentsById.has(id),
  ).length;

  return {
    wpAuthors: authors.length,
    authorsWithTfLibro,
    authorsWithoutTfLibro: authors.length - authorsWithTfLibro,
    authorClassificationCounts: {
      legacy_author_book_combined: authors.filter(
        (author) => author.classification === 'legacy_author_book_combined',
      ).length,
      author_only_candidate: authors.filter(
        (author) => author.classification === 'author_only_candidate',
      ).length,
      ambiguous: authors.filter((author) => author.classification === 'ambiguous').length,
    },
    uniqueBookCandidates: uniqueBookTitles.size,
    duplicatedBookTitles,
    recordsWithVideo: books.filter((book) => book.videoId).length,
    recordsWithThumbnail: authors.filter((author) => author.thumbnailId).length,
    recordsWithImagenDestacada2: authors.filter((author) => author.imageFieldId).length,
    recordsWithYoastMetaDescription: authors.filter((author) => author.yoastMetaDescription).length,
    resolvedAttachmentReferences,
    brokenImageReferences: imageReferences.length - resolvedAttachmentReferences,
    possibleDuplicateAuthors: authors.filter((author) => author.possibleDuplicateGroup).length,
  };
}

function buildPilotSample(authors: AuthorCandidate[], books: BookCandidate[]) {
  const cases = uniquePilotCases([
    pickBookCase(
      'legacy_simple',
      'Legacy con tf_libro y relación inferida.',
      books.find((book) => !book.duplicateGroupId && !book.videoId),
    ),
    pickBookCase(
      'duplicate_multi_author',
      'Título duplicado o multi-autor candidato.',
      books.find((book) => book.duplicateGroupId),
    ),
    pickBookCase(
      'with_video',
      'Registro legacy con video.',
      books.find((book) => book.videoId),
    ),
    pickBookCase(
      'without_video',
      'Registro legacy sin video.',
      books.find((book) => !book.videoId),
    ),
    pickBookCase(
      'with_image',
      'Registro con imagen asociada.',
      books.find((book) => book.thumbnailId),
    ),
    pickAuthorCase(
      'modern_author_without_book',
      'Autor moderno sin tf_libro.',
      authors.find((author) => author.classification === 'author_only_candidate'),
    ),
    pickAuthorCase(
      'ambiguous_author',
      'Autor ambiguo para revisión manual.',
      authors.find((author) => author.classification === 'ambiguous'),
    ),
    pickAuthorCase(
      'ambiguous_image_role',
      'Registro con _thumbnail_id e imagen_destacada_2 diferentes.',
      authors.find(
        (author) =>
          author.thumbnailId && author.imageFieldId && author.thumbnailId !== author.imageFieldId,
      ),
    ),
    pickAuthorCase(
      'possible_duplicate_author',
      'Posible duplicado por nombre o slug normalizado.',
      authors.find((author) => author.possibleDuplicateGroup),
    ),
    pickAuthorCase(
      'with_yoast_meta_description',
      'Autor con metadescripción Yoast disponible.',
      authors.find((author) => author.yoastMetaDescription),
    ),
    pickAuthorCase(
      'with_secondary_image_field',
      'Autor con imagen_destacada_2 para revisar patrón de imagen.',
      authors.find((author) => author.imageFieldId),
    ),
    pickAuthorCase(
      'with_html_review',
      'Registro con ta_resena HTML preservado.',
      authors.find((author) => /<[^>]+>/u.test(author.rawReview)),
    ),
    pickBookCase(
      'legacy_missing_dedicated_book_url',
      'Libro legacy sin URL antigua dedicada propia.',
      books.find((book) => book.sourceOldUrl),
    ),
    pickAuthorCase(
      'recent_author',
      'Registro reciente por fecha de modificación.',
      [...authors].sort((left, right) =>
        right.sourceWpPostId.localeCompare(left.sourceWpPostId),
      )[0],
    ),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    cases: cases.slice(0, 15),
  };
}

function pickBookCase(kind: string, reason: string, book: BookCandidate | undefined) {
  if (!book) {
    return null;
  }

  return {
    kind,
    reason,
    sourceWpPostId: book.sourceWpPostId,
    bookCandidateKey: book.candidateKey,
    title: book.title,
  };
}

function pickAuthorCase(kind: string, reason: string, author: AuthorCandidate | undefined) {
  if (!author) {
    return null;
  }

  return {
    kind,
    reason,
    sourceWpPostId: author.sourceWpPostId,
    authorCandidateKey: author.candidateKey,
    title: author.name,
  };
}

function uniquePilotCases(
  cases: Array<{
    kind: string;
    reason: string;
    sourceWpPostId: string;
    authorCandidateKey?: string;
    bookCandidateKey?: string;
    title: string;
  } | null>,
) {
  const seen = new Set<string>();
  const uniqueCases: NonNullable<(typeof cases)[number]>[] = [];

  for (const item of cases) {
    if (!item) {
      continue;
    }

    const key = `${item.kind}:${item.sourceWpPostId}:${
      item.authorCandidateKey ?? item.bookCandidateKey ?? ''
    }`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueCases.push(item);
  }

  return uniqueCases;
}

function buildModelGapAnalysis(): ModelGapField[] {
  return [
    {
      sourceField: 'post_title autor',
      targetModel: 'authors.name',
      classification: 'DIRECT_MAP',
      notes: 'Requiere deduplicación manual previa.',
    },
    {
      sourceField: 'post_name autor',
      targetModel: 'authors.slug',
      classification: 'DIRECT_MAP',
      notes: 'Validar slugs vacíos y sufijos -2/-3.',
    },
    {
      sourceField: 'tf_libro',
      targetModel: 'books.title',
      classification: 'DERIVED_MAP',
      notes: 'En legacy se deriva desde CPT autor, no desde CPT libro.',
    },
    {
      sourceField: 'ta_resena',
      targetModel: 'books.description / authors.biography',
      classification: 'MANUAL_REVIEW',
      notes: 'Uso histórico ambiguo; conservar raw HTML.',
    },
    {
      sourceField: 'bio_cf',
      targetModel: 'authors.biography',
      classification: 'MANUAL_REVIEW',
      notes: 'Puede complementar biografía.',
    },
    {
      sourceField: '_thumbnail_id',
      targetModel: 'authors.photo_url / books.cover_url',
      classification: 'MANUAL_REVIEW',
      notes: 'Rol de imagen ambiguo en legacy.',
    },
    {
      sourceField: 'imagen_destacada_2',
      targetModel: 'authors.photo_url / books.cover_url',
      classification: 'MANUAL_REVIEW',
      notes: 'Resolver contra attachments y revisar patrón.',
    },
    {
      sourceField: 'tf_video',
      targetModel: '',
      classification: 'NOT_CURRENTLY_MODELED',
      notes: 'No existe campo de video en el modelo actual.',
    },
    {
      sourceField: 'tf_isbn',
      targetModel: 'book_editions.isbn13 / isbn10',
      classification: 'DIRECT_MAP',
      notes: 'Disponible en ACF moderno si existen libros reales.',
    },
    {
      sourceField: 'tf_pvp',
      targetModel: 'book_editions.price',
      classification: 'DIRECT_MAP',
      notes: 'Normalizar moneda/decimal.',
    },
    {
      sourceField: 'tf_n_paginas',
      targetModel: 'book_editions.pages',
      classification: 'DIRECT_MAP',
      notes: 'Disponible en ACF moderno.',
    },
    {
      sourceField: 'tf_encuadernacion',
      targetModel: 'book_editions.format',
      classification: 'DERIVED_MAP',
      notes: 'Mapeo a enum de formato requerido.',
    },
    {
      sourceField: 'tf_alto',
      targetModel: '',
      classification: 'NOT_CURRENTLY_MODELED',
      notes: 'Dimensiones físicas no modeladas.',
    },
    {
      sourceField: 'tf_ancho',
      targetModel: '',
      classification: 'NOT_CURRENTLY_MODELED',
      notes: 'Dimensiones físicas no modeladas.',
    },
    {
      sourceField: 'tf_peso',
      targetModel: '',
      classification: 'NOT_CURRENTLY_MODELED',
      notes: 'Peso físico no modelado.',
    },
    {
      sourceField: 'tf_link_compra_1',
      targetModel: '',
      classification: 'NOT_CURRENTLY_MODELED',
      notes: 'Enlace de compra no modelado.',
    },
    {
      sourceField: '_edit_lock',
      targetModel: '',
      classification: 'IGNORE_SYSTEM',
      notes: 'Meta interno de WordPress.',
    },
  ];
}

function inferMimeType(item: WordPressItem) {
  const explicit = getMetaValue(item.metas, '_wp_attachment_metadata');
  const url = item.guid || getMetaValue(item.metas, '_wp_attached_file') || explicit;
  const extension = url.split('?')[0]?.split('.').pop()?.toLowerCase() ?? '';

  if (['jpg', 'jpeg'].includes(extension)) {
    return 'image/jpeg';
  }

  if (extension === 'png') {
    return 'image/png';
  }

  if (extension === 'webp') {
    return 'image/webp';
  }

  if (extension === 'pdf') {
    return 'application/pdf';
  }

  return '';
}

function getMetaValue(metas: WordPressMeta[], key: string) {
  return metas.find((meta) => meta.key === key)?.value ?? '';
}

function resolveAttachmentUrl(id: string, attachmentsById: Map<string, AttachmentCandidate>) {
  if (!id) {
    return '';
  }

  return attachmentsById.get(id)?.url ?? '';
}

function getSerializedValue(serialized: string, key: string) {
  const stringPattern = new RegExp(`"${escapeRegExp(key)}";s:\\d+:"([^"]*)"`, 'u');
  const integerPattern = new RegExp(`"${escapeRegExp(key)}";i:(\\d+)`, 'u');
  const stringMatch = stringPattern.exec(serialized);
  const integerMatch = integerPattern.exec(serialized);

  return stringMatch?.[1] ?? integerMatch?.[1] ?? '';
}

function getYoastMetaTitle(metas: WordPressMeta[]) {
  return getMetaValue(metas, '_yoast_wpseo_title') || getMetaValue(metas, 'yoast_wpseo_title');
}

function getYoastMetaDescription(metas: WordPressMeta[]) {
  return (
    getMetaValue(metas, '_yoast_wpseo_metadesc') || getMetaValue(metas, 'yoast_wpseo_metadesc')
  );
}

function getCanonicalUrl(metas: WordPressMeta[]) {
  return (
    getMetaValue(metas, '_yoast_wpseo_canonical') || getMetaValue(metas, 'yoast_wpseo_canonical')
  );
}

function makeIssue(
  severity: Issue['severity'],
  code: string,
  entityType: string,
  sourceWpPostId: string,
  candidateKey: string,
  message: string,
  details: string,
): Issue {
  return { severity, code, entityType, sourceWpPostId, candidateKey, message, details };
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item);
    const current = groups.get(key) ?? [];
    current.push(item);
    groups.set(key, current);
  }

  return groups;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
