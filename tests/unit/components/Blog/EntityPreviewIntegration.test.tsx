/**
 * Smoke test: a `[[person:slug|label]]` shortcode resolves through BlogMarkdown into
 * an entity-preview-aware anchor (data attributes, hover behavior). react-markdown
 * itself is ESM-only and can't be parsed by ts-jest's CommonJS pipeline, so we mock
 * it to a tiny renderer that pulls out the link nodes via the `components.a` prop.
 */
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType } from 'react';
import { clearEntityPreviewCache } from '../../../../src/hooks/useEntityPreview';

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({
    children,
    components,
  }: {
    children: string;
    components: { a: ComponentType<{ href: string; children: React.ReactNode }> };
  }) => {
    // Tiny renderer that finds all `[label](href)` patterns and renders them via the
    // `components.a` override. Everything else is plain text. Sufficient for verifying
    // the BlogMarkdown → EntityPreviewLink wiring; full markdown rendering is covered
    // by the live React Markdown library in the browser.
    const A = components.a;
    const parts: Array<string | React.ReactElement> = [];
    const re = /\[([^\]]+)\]\(([^)]+)\)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(children)) !== null) {
      if (m.index > last) parts.push(children.slice(last, m.index));
      parts.push(
        <A key={m.index} href={m[2]}>
          {m[1]}
        </A>
      );
      last = m.index + m[0].length;
    }
    if (last < children.length) parts.push(children.slice(last));
    return <div>{parts}</div>;
  },
}));

jest.mock('remark-gfm', () => ({ __esModule: true, default: () => null }));

jest.mock('../../../../src/services/api', () => ({
  personsApi: {
    getBySlug: jest.fn().mockResolvedValue({
      id: 'sam-altman',
      canonicalName: 'Sam Altman',
      slug: 'sam-altman',
      shortBio: 'CEO of OpenAI.',
      currentRole: 'CEO',
      imageUrl: null,
      currentOrg: { id: 'openai', name: 'OpenAI', slug: 'openai', type: 'company' },
    }),
  },
  organizationsApi: { getBySlug: jest.fn() },
  glossaryApi: { getBySlug: jest.fn() },
  eventsApi: { getById: jest.fn() },
  subjectsApi: { getBySlug: jest.fn() },
}));

import { BlogMarkdown } from '../../../../src/components/Blog/BlogMarkdown';

beforeEach(() => {
  clearEntityPreviewCache();
});

describe('BlogMarkdown + EntityPreviewLink integration', () => {
  it('routes [[person:slug|label]] through EntityPreviewLink with the right data attrs', async () => {
    jest.useFakeTimers();
    try {
      render(
        <MemoryRouter>
          <BlogMarkdown markdown="See [[person:sam-altman|Sam]]." />
        </MemoryRouter>
      );
      const link = screen.getByRole('link', { name: 'Sam' });
      expect(link).toHaveAttribute('href', '/people/sam-altman');
      expect(link).toHaveAttribute('data-entity-type', 'person');
      expect(link).toHaveAttribute('data-entity-slug', 'sam-altman');

      fireEvent.mouseEnter(link);
      act(() => {
        jest.advanceTimersByTime(160);
      });
      expect(screen.getByTestId('entity-preview-card')).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
    await waitFor(() => expect(screen.getByText('Sam Altman')).toBeInTheDocument());
  });

  it('leaves non-entity hrefs as plain anchors (no data attrs)', () => {
    render(
      <MemoryRouter>
        <BlogMarkdown markdown="[Search](https://google.com)" />
      </MemoryRouter>
    );
    const link = screen.getByRole('link', { name: 'Search' });
    expect(link).toHaveAttribute('href', 'https://google.com');
    expect(link).not.toHaveAttribute('data-entity-type');
  });
});
