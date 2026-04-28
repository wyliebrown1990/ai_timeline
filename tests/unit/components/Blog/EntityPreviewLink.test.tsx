import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { parseEntityHref } from '../../../../src/components/Blog/parseEntityHref';
import { EntityPreviewLink } from '../../../../src/components/Blog/EntityPreviewLink';

jest.mock('../../../../src/services/api', () => {
  const empty = () => new Promise(() => {}); // never resolves — keeps card in skeleton state for these tests
  return {
    personsApi: { getBySlug: jest.fn(empty) },
    organizationsApi: { getBySlug: jest.fn(empty) },
    glossaryApi: { getBySlug: jest.fn(empty) },
    eventsApi: { getById: jest.fn(empty) },
  };
});

describe('parseEntityHref', () => {
  it('parses /people/:slug', () => {
    expect(parseEntityHref('/people/sam-altman')).toEqual({ type: 'person', slug: 'sam-altman' });
  });

  it('parses /organizations/:slug', () => {
    expect(parseEntityHref('/organizations/openai')).toEqual({ type: 'organization', slug: 'openai' });
  });

  it('parses /glossary/:slug', () => {
    expect(parseEntityHref('/glossary/transformer')).toEqual({ type: 'glossary', slug: 'transformer' });
  });

  it('parses /events/:id as milestone', () => {
    expect(parseEntityHref('/events/E2017_TRANSFORMER')).toEqual({
      type: 'milestone',
      slug: 'E2017_TRANSFORMER',
    });
  });

  it('returns null for unknown prefixes', () => {
    expect(parseEntityHref('/login')).toBeNull();
    expect(parseEntityHref('https://example.com')).toBeNull();
    expect(parseEntityHref('')).toBeNull();
    expect(parseEntityHref(undefined)).toBeNull();
  });

  it('returns null for an empty slug', () => {
    expect(parseEntityHref('/people/')).toBeNull();
    expect(parseEntityHref('/glossary/')).toBeNull();
  });
});

function renderLink(href: string, label = 'Sam') {
  return render(
    <MemoryRouter>
      <EntityPreviewLink href={href}>{label}</EntityPreviewLink>
    </MemoryRouter>
  );
}

describe('EntityPreviewLink trigger', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders a plain <a> for non-entity hrefs', () => {
    render(
      <MemoryRouter>
        <EntityPreviewLink href="https://example.com">External</EntityPreviewLink>
      </MemoryRouter>
    );
    const link = screen.getByText('External');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('opens popover ~150ms after mouseenter on entity href', async () => {
    renderLink('/people/sam-altman');
    const link = screen.getByText('Sam');
    fireEvent.mouseEnter(link);
    expect(screen.queryByTestId('entity-preview-card')).not.toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(160);
    });
    await waitFor(() => {
      expect(screen.getByTestId('entity-preview-card')).toBeInTheDocument();
    });
  });

  it('closes popover ~100ms after mouseleave', async () => {
    renderLink('/people/sam-altman');
    const link = screen.getByText('Sam');
    fireEvent.mouseEnter(link);
    act(() => {
      jest.advanceTimersByTime(160);
    });
    await waitFor(() => expect(screen.getByTestId('entity-preview-card')).toBeInTheDocument());
    fireEvent.mouseLeave(link);
    act(() => {
      jest.advanceTimersByTime(120);
    });
    await waitFor(() => {
      expect(screen.queryByTestId('entity-preview-card')).not.toBeInTheDocument();
    });
  });

  it('opens popover after a 350ms long-press and suppresses the click', async () => {
    renderLink('/people/sam-altman');
    const link = screen.getByText('Sam');
    fireEvent.touchStart(link);
    expect(screen.queryByTestId('entity-preview-card')).not.toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(360);
    });
    await waitFor(() => expect(screen.getByTestId('entity-preview-card')).toBeInTheDocument());
    const clickEvent = fireEvent.click(link);
    // fireEvent.click returns false if preventDefault was called.
    expect(clickEvent).toBe(false);
  });

  it('cancels long-press when the touch ends before 350ms; click still navigates', () => {
    renderLink('/people/sam-altman');
    const link = screen.getByText('Sam');
    fireEvent.touchStart(link);
    act(() => {
      jest.advanceTimersByTime(150);
    });
    fireEvent.touchEnd(link);
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.queryByTestId('entity-preview-card')).not.toBeInTheDocument();
    const clickEvent = fireEvent.click(link);
    expect(clickEvent).toBe(true);
  });
});
