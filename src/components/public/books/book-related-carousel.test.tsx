import { renderToStaticMarkup } from 'react-dom/server';
import type { FocusEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BookWithDetails } from '@/services/books/book.types';

const mocks = vi.hoisted(() => ({
  track: { clientWidth: 1200, scrollWidth: 740 },
  effects: [] as (() => void | (() => void))[],
  resize: undefined as (() => void) | undefined,
  hasOverflow: false,
  setOverflow: vi.fn(),
  observe: vi.fn(),
  disconnect: vi.fn(),
  querySelector: vi.fn(),
}));

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useRef: () => ({ current: { querySelector: mocks.querySelector } }),
  useState: () => [mocks.hasOverflow, mocks.setOverflow],
  useEffect: (effect: () => void | (() => void)) => mocks.effects.push(effect),
}));

vi.mock('@/components/public/featured-books-carousel', () => ({
  FeaturedBooksCarousel: ({
    books,
    className,
  }: {
    books: BookWithDetails[];
    className?: string;
  }) => <div data-testid="original-carousel" data-count={books.length} className={className} />,
}));

import { BookRelatedCarousel } from './book-related-carousel';

describe('BookRelatedCarousel overflow adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.effects = [];
    mocks.resize = undefined;
    mocks.hasOverflow = false;
    mocks.track.clientWidth = 1200;
    mocks.track.scrollWidth = 740;
    mocks.setOverflow.mockImplementation((value: boolean) => {
      mocks.hasOverflow = value;
    });
    mocks.querySelector.mockReturnValue(mocks.track);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = mocks.observe;
        disconnect = mocks.disconnect;
        constructor(callback: () => void) {
          mocks.resize = callback;
        }
      },
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it('reuses the original carousel and hides unnecessary arrows when all slides fit', () => {
    renderToStaticMarkup(<BookRelatedCarousel books={[]} />);
    mocks.effects[0]();
    const html = renderToStaticMarkup(<BookRelatedCarousel books={[]} />);

    expect(html).toContain('data-testid="original-carousel"');
    expect(html).toContain('[&amp;&gt;button]:!hidden');
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Libros recomendados"');
    expect(mocks.setOverflow).toHaveBeenCalledWith(false);
    expect(mocks.observe).toHaveBeenCalledWith(mocks.track);
  });

  it('restores the original responsive controls when the track overflows', () => {
    mocks.track.scrollWidth = 2800;
    renderToStaticMarkup(<BookRelatedCarousel books={[]} />);
    mocks.effects[0]();

    expect(mocks.setOverflow).toHaveBeenCalledWith(true);
    expect(renderToStaticMarkup(<BookRelatedCarousel books={[]} />)).not.toContain('!hidden');
  });

  it('updates control visibility after resizing in either direction', () => {
    renderToStaticMarkup(<BookRelatedCarousel books={[]} />);
    const cleanup = mocks.effects[0]();
    mocks.track.clientWidth = 600;
    mocks.resize?.();
    expect(mocks.hasOverflow).toBe(true);
    mocks.track.clientWidth = 1200;
    mocks.resize?.();
    expect(mocks.hasOverflow).toBe(false);
    if (typeof cleanup === 'function') cleanup();
    expect(mocks.disconnect).toHaveBeenCalledOnce();
  });

  it('tolerates a missing track without installing an observer', () => {
    mocks.querySelector.mockReturnValue(null);
    renderToStaticMarkup(<BookRelatedCarousel books={[]} />);
    expect(mocks.effects[0]()).toBeUndefined();
    expect(mocks.observe).not.toHaveBeenCalled();
  });

  it('reveals the complete focused slide without taking over carousel navigation', () => {
    const scrollIntoView = vi.fn();
    const schedule = vi.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('requestAnimationFrame', schedule);
    const element = BookRelatedCarousel({ books: [] });
    const props = element.props as { onFocusCapture: (event: FocusEvent<HTMLDivElement>) => void };

    props.onFocusCapture({
      target: { closest: () => ({ scrollIntoView }) },
    } as unknown as FocusEvent<HTMLDivElement>);

    expect(scrollIntoView).toHaveBeenCalledWith({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'instant',
    });
    expect(schedule).toHaveBeenCalledOnce();
    props.onFocusCapture({
      target: { closest: () => null },
    } as unknown as FocusEvent<HTMLDivElement>);
    expect(schedule).toHaveBeenCalledOnce();
  });
});
