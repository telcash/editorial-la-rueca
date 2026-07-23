import type {
  PilotAttachmentCandidate,
  PilotAuthorCandidate,
  PilotBookCandidate,
  PilotRelationshipCandidate,
} from '@/features/migration/wordpress-pilot/types';

type CoverConfidence = 'high' | 'medium' | 'low';

export interface BookCoverAnalysisInput {
  books: PilotBookCandidate[];
  authors: PilotAuthorCandidate[];
  relationships: PilotRelationshipCandidate[];
  attachments: PilotAttachmentCandidate[];
}

export interface BookCoverCandidate {
  bookCandidateKey: string;
  bookTitle: string;
  sourceWpPostId: string;
  authorNames: string;
  attachmentId: string;
  attachmentUrl: string;
  filename: string;
  attachmentTitle: string;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  score: number;
  confidence: CoverConfidence;
  reasons: string;
}

export interface BookCoverBestMatch {
  bookCandidateKey: string;
  bookTitle: string;
  bestCandidate: BookCoverCandidate | null;
  confidence: CoverConfidence | 'none';
  alternatives: BookCoverCandidate[];
  reasons: string[];
}

export interface BookCoverAnalysis {
  generatedAt: string;
  candidates: BookCoverCandidate[];
  bestMatches: BookCoverBestMatch[];
  statistics: {
    totalBooks: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    withoutCandidate: number;
  };
}

interface AttachmentScore {
  score: number;
  reasons: string[];
}

const highConfidenceThreshold = 70;
const mediumConfidenceThreshold = 45;
const lowConfidenceThreshold = 25;
const candidateOutputThreshold = 10;

const coverWords = ['portada', 'cover', 'cubierta', 'mockup', 'libro', 'book'];
const authorPhotoWords = ['foto', 'photo', 'autor', 'author', 'portrait', 'retrato', 'perfil'];
const pilotBookTitles = new Set([
  normalizeComparable('Réquiem por un escritor desconocido').compact,
  normalizeComparable('Cruce de Pasos').compact,
  normalizeComparable('El Valle de Cristal').compact,
]);

export function normalizeComparable(value: string) {
  const ascii = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const spaced = ascii
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  return {
    spaced,
    compact: spaced.replace(/\s+/g, ''),
    tokens: spaced.length > 0 ? spaced.split(' ') : [],
  };
}

export function analyzeBookCoverCandidates(input: BookCoverAnalysisInput): BookCoverAnalysis {
  const authorsByCandidateKey = new Map(
    input.authors.map((author) => [author.candidateKey, author]),
  );
  const authorsBySourceWpPostId = new Map(
    input.authors.map((author) => [author.sourceWpPostId, author]),
  );
  const relationshipsByBook = groupRelationshipsByBook(input.relationships);
  const candidates: BookCoverCandidate[] = [];
  const bestMatches: BookCoverBestMatch[] = [];

  for (const book of input.books) {
    const authorNames = getBookAuthorNames(book, relationshipsByBook, authorsByCandidateKey);
    const sourceAuthor = authorsBySourceWpPostId.get(book.sourceWpPostId);
    const scoredCandidates = input.attachments
      .map((attachment) =>
        scoreAttachmentForBook({
          book,
          authorNames,
          sourceAuthor,
          attachment,
        }),
      )
      .filter((candidate) => candidate.score >= candidateOutputThreshold)
      .sort(compareCoverCandidates)
      .slice(0, 5);

    candidates.push(...scoredCandidates);
    bestMatches.push(createBestMatch(book, scoredCandidates));
  }

  return {
    generatedAt: new Date().toISOString(),
    candidates,
    bestMatches,
    statistics: {
      totalBooks: input.books.length,
      highConfidence: bestMatches.filter((match) => match.confidence === 'high').length,
      mediumConfidence: bestMatches.filter((match) => match.confidence === 'medium').length,
      lowConfidence: bestMatches.filter((match) => match.confidence === 'low').length,
      withoutCandidate: bestMatches.filter((match) => match.confidence === 'none').length,
    },
  };
}

export function getPilotBookCoverMatches(analysis: BookCoverAnalysis) {
  const matchesByTitle = new Map<string, BookCoverBestMatch[]>();

  for (const match of analysis.bestMatches) {
    const normalizedTitle = normalizeComparable(match.bookTitle).compact;

    if (!pilotBookTitles.has(normalizedTitle)) {
      continue;
    }

    const current = matchesByTitle.get(normalizedTitle) ?? [];
    current.push(match);
    matchesByTitle.set(normalizedTitle, current);
  }

  return [...matchesByTitle.values()].map(mergeMatchesByTitle);
}

function groupRelationshipsByBook(relationships: PilotRelationshipCandidate[]) {
  const grouped = new Map<string, PilotRelationshipCandidate[]>();

  for (const relationship of relationships) {
    const current = grouped.get(relationship.bookCandidateKey) ?? [];
    current.push(relationship);
    grouped.set(relationship.bookCandidateKey, current);
  }

  return grouped;
}

function getBookAuthorNames(
  book: PilotBookCandidate,
  relationshipsByBook: Map<string, PilotRelationshipCandidate[]>,
  authorsByCandidateKey: Map<string, PilotAuthorCandidate>,
) {
  const names =
    relationshipsByBook
      .get(book.candidateKey)
      ?.map((relationship) => authorsByCandidateKey.get(relationship.authorCandidateKey)?.name)
      .filter((name): name is string => Boolean(name)) ?? [];

  return names.length > 0 ? names.join(' | ') : book.sourceAuthorTitle;
}

function scoreAttachmentForBook(params: {
  book: PilotBookCandidate;
  authorNames: string;
  sourceAuthor: PilotAuthorCandidate | undefined;
  attachment: PilotAttachmentCandidate;
}): BookCoverCandidate {
  const { score, reasons } = calculateAttachmentScore(params);
  const width = toPositiveNumber(params.attachment.width);
  const height = toPositiveNumber(params.attachment.height);
  const aspectRatio = width && height ? width / height : null;

  return {
    bookCandidateKey: params.book.candidateKey,
    bookTitle: params.book.title,
    sourceWpPostId: params.book.sourceWpPostId,
    authorNames: params.authorNames,
    attachmentId: params.attachment.wpPostId,
    attachmentUrl: params.attachment.url,
    filename: params.attachment.attachedFile || getFilenameFromUrl(params.attachment.url),
    attachmentTitle: params.attachment.title,
    width,
    height,
    aspectRatio: aspectRatio ? Number(aspectRatio.toFixed(3)) : null,
    score,
    confidence: getConfidence(score),
    reasons: reasons.join(' | '),
  };
}

function calculateAttachmentScore(params: {
  book: PilotBookCandidate;
  authorNames: string;
  sourceAuthor: PilotAuthorCandidate | undefined;
  attachment: PilotAttachmentCandidate;
}): AttachmentScore {
  const reasons: string[] = [];
  let score = 0;
  const bookTitle = normalizeComparable(params.book.title);
  const authorNames = normalizeComparable(params.authorNames);
  const filename = normalizeComparable(
    params.attachment.attachedFile || getFilenameFromUrl(params.attachment.url),
  );
  const title = normalizeComparable(params.attachment.title);
  const slug = normalizeComparable(params.attachment.slug);
  const combined = normalizeComparable(
    `${params.attachment.attachedFile} ${params.attachment.title} ${params.attachment.slug} ${params.attachment.url}`,
  );
  const width = toPositiveNumber(params.attachment.width);
  const height = toPositiveNumber(params.attachment.height);

  score += scoreTitleMatch(
    filename,
    bookTitle,
    42,
    'filename contiene el titulo del libro',
    reasons,
  );
  score += scoreTitleMatch(
    title,
    bookTitle,
    36,
    'attachment title contiene el titulo del libro',
    reasons,
  );
  score += scoreTitleMatch(slug, bookTitle, 32, 'slug contiene el titulo del libro', reasons);

  const positiveCoverWords = coverWords.filter((word) => combined.tokens.includes(word));

  if (positiveCoverWords.length > 0) {
    score += 18;
    reasons.push(`filename/title contiene señal de portada: ${positiveCoverWords.join(', ')}`);
  }

  if (params.attachment.parentId && params.attachment.parentId === params.book.sourceWpPostId) {
    score += 24;
    reasons.push('post_parent coincide con el registro legacy del libro');
  }

  if (params.sourceAuthor?.imageFieldId === params.attachment.wpPostId) {
    score += 10;
    reasons.push('coincide con imagen_destacada_2 del registro legacy');
  }

  if (params.sourceAuthor?.thumbnailId === params.attachment.wpPostId) {
    score += 4;
    reasons.push('coincide con _thumbnail_id del registro legacy');
  }

  if (width && height) {
    const aspectRatio = width / height;

    if (aspectRatio >= 0.55 && aspectRatio <= 0.8) {
      score += 12;
      reasons.push('proporcion vertical compatible con portada');
    } else if (aspectRatio > 1.15) {
      score -= 16;
      reasons.push('imagen horizontal o panoramica');
    } else if (aspectRatio >= 0.9 && aspectRatio <= 1.1) {
      score -= 8;
      reasons.push('imagen casi cuadrada; debil como portada');
    }

    if (height >= 700 && width >= 400 && aspectRatio >= 0.55 && aspectRatio <= 0.8) {
      score += 8;
      reasons.push('dimensiones razonables para cover');
    }

    if (width <= 350 && height <= 350) {
      score -= 18;
      reasons.push('dimensiones tipo avatar');
    }
  }

  const negativePhotoWords = authorPhotoWords.filter((word) => combined.tokens.includes(word));

  if (negativePhotoWords.length > 0) {
    score -= 30;
    reasons.push(`contiene señal de foto de autor: ${negativePhotoWords.join(', ')}`);
  }

  if (
    authorNames.compact.length > 0 &&
    combined.compact.includes(authorNames.compact) &&
    !containsNormalizedTitle(combined, bookTitle)
  ) {
    score -= 24;
    reasons.push('contiene nombre de autor sin contener titulo del libro');
  }

  return {
    score,
    reasons: reasons.length > 0 ? reasons : ['sin evidencia suficiente'],
  };
}

function scoreTitleMatch(
  value: ReturnType<typeof normalizeComparable>,
  title: ReturnType<typeof normalizeComparable>,
  points: number,
  reason: string,
  reasons: string[],
) {
  if (!containsNormalizedTitle(value, title)) {
    return 0;
  }

  reasons.push(reason);
  return points;
}

function containsNormalizedTitle(
  value: ReturnType<typeof normalizeComparable>,
  title: ReturnType<typeof normalizeComparable>,
) {
  if (title.compact.length === 0 || value.compact.length === 0) {
    return false;
  }

  return value.compact.includes(title.compact);
}

function getConfidence(score: number): CoverConfidence {
  if (score >= highConfidenceThreshold) {
    return 'high';
  }

  if (score >= mediumConfidenceThreshold) {
    return 'medium';
  }

  return 'low';
}

function createBestMatch(
  book: PilotBookCandidate,
  candidates: BookCoverCandidate[],
): BookCoverBestMatch {
  const [bestCandidate] = candidates.filter(hasSufficientCoverEvidence);
  const alternatives = candidates.filter(
    (candidate) => candidate.attachmentId !== bestCandidate?.attachmentId,
  );

  if (!bestCandidate || bestCandidate.score < lowConfidenceThreshold) {
    return {
      bookCandidateKey: book.candidateKey,
      bookTitle: book.title,
      bestCandidate: null,
      confidence: 'none',
      alternatives: candidates,
      reasons: ['No hay candidato con evidencia suficiente; no se fuerza portada.'],
    };
  }

  return {
    bookCandidateKey: book.candidateKey,
    bookTitle: book.title,
    bestCandidate,
    confidence: bestCandidate.confidence,
    alternatives,
    reasons: bestCandidate.reasons.split(' | '),
  };
}

function mergeMatchesByTitle(matches: BookCoverBestMatch[]): BookCoverBestMatch {
  const [firstMatch] = matches;

  if (!firstMatch) {
    throw new Error('Cannot merge empty book cover match group.');
  }

  const candidatesByAttachmentId = new Map<string, BookCoverCandidate>();

  for (const match of matches) {
    for (const candidate of [match.bestCandidate, ...match.alternatives]) {
      if (!candidate) {
        continue;
      }

      const current = candidatesByAttachmentId.get(candidate.attachmentId);

      if (!current || candidate.score > current.score) {
        candidatesByAttachmentId.set(candidate.attachmentId, candidate);
      }
    }
  }

  const candidates = [...candidatesByAttachmentId.values()].sort(compareCoverCandidates);
  const [bestCandidate] = candidates.filter(hasSufficientCoverEvidence);
  const alternatives = candidates.filter(
    (candidate) => candidate.attachmentId !== bestCandidate?.attachmentId,
  );

  if (!bestCandidate || bestCandidate.score < lowConfidenceThreshold) {
    return {
      bookCandidateKey: firstMatch.bookCandidateKey,
      bookTitle: firstMatch.bookTitle,
      bestCandidate: null,
      confidence: 'none',
      alternatives,
      reasons: ['No hay candidato con evidencia suficiente; no se fuerza portada.'],
    };
  }

  return {
    bookCandidateKey: firstMatch.bookCandidateKey,
    bookTitle: firstMatch.bookTitle,
    bestCandidate,
    confidence: bestCandidate.confidence,
    alternatives,
    reasons: bestCandidate.reasons.split(' | '),
  };
}

function hasSufficientCoverEvidence(candidate: BookCoverCandidate) {
  return (
    candidate.reasons.includes('titulo del libro') ||
    candidate.reasons.includes('post_parent coincide') ||
    candidate.reasons.includes('imagen_destacada_2') ||
    candidate.reasons.includes('_thumbnail_id')
  );
}

function compareCoverCandidates(first: BookCoverCandidate, second: BookCoverCandidate) {
  if (second.score !== first.score) {
    return second.score - first.score;
  }

  return first.attachmentId.localeCompare(second.attachmentId);
}

function toPositiveNumber(value: string) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function getFilenameFromUrl(url: string) {
  const [withoutQuery] = url.split('?');
  const segments = withoutQuery.split('/');

  return segments.at(-1) ?? '';
}
