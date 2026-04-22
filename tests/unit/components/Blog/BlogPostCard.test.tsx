/**
 * Sprint Blog-2 — BlogPostCard renders all three variants with the right
 * DOM shape. Keeps the test lightweight: visual polish is verified via
 * live /Browser QA, this suite just catches shape regressions.
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BlogPostCard } from '../../../../src/components/Blog/BlogPostCard';
import type { BlogPostListItem } from '../../../../src/types/blog';

const BASE_POST: BlogPostListItem = {
  id: 'post-1',
  slug: 'hello-world',
  title: 'Hello world',
  subtitle: 'A sample subtitle',
  excerpt: 'Short excerpt for the card body.',
  coverImageUrl: 'https://example.com/cover.jpg',
  status: 'published',
  publishedAt: '2026-04-22T00:00:00Z',
  readingMinutes: 3,
  tags: ['editorial', 'atlas'],
  featured: false,
  author: { id: 'a1', slug: 'wylie-brown', name: 'Wylie Brown', avatarUrl: null },
  subjects: [],
};

function renderCard(props: Parameters<typeof BlogPostCard>[0]) {
  return render(
    <MemoryRouter>
      <BlogPostCard {...props} />
    </MemoryRouter>
  );
}

describe('BlogPostCard', () => {
  it('renders default variant with cover + title + excerpt', () => {
    renderCard({ post: BASE_POST });
    const card = screen.getByTestId('blog-post-card');
    expect(card).toHaveAttribute('data-variant', 'default');
    expect(card).toHaveAttribute('href', '/blog/hello-world');
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText(/Short excerpt/)).toBeInTheDocument();
    expect(screen.getByText('3 min read')).toBeInTheDocument();
  });

  it('renders featured variant with "Featured" label and subtitle', () => {
    renderCard({ post: { ...BASE_POST, featured: true }, variant: 'featured', lcp: true });
    expect(screen.getByTestId('blog-post-card')).toHaveAttribute('data-variant', 'featured');
    expect(screen.getByText('Featured')).toBeInTheDocument();
    expect(screen.getByText('A sample subtitle')).toBeInTheDocument();
  });

  it('renders compact variant without a cover image', () => {
    renderCard({ post: BASE_POST, variant: 'compact' });
    const card = screen.getByTestId('blog-post-card');
    expect(card).toHaveAttribute('data-variant', 'compact');
    // Compact variant skips the cover image even when the post has one.
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('falls back to author initials when no avatar is present', () => {
    renderCard({ post: BASE_POST });
    expect(screen.getByText('WB')).toBeInTheDocument();
  });

  it('marks LCP image as eager+high-priority', () => {
    renderCard({ post: BASE_POST, variant: 'featured', lcp: true });
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('fetchpriority')).toBe('high');
  });
});
