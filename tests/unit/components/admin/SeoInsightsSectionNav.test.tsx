import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { SeoInsightsSectionNav } from '../../../../src/components/admin/SeoInsightsSectionNav';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="seo-nav-pathname">{location.pathname}</div>;
}

function renderNav(initialPath = '/admin/seo-insights/portfolio', activeCount = 10) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SeoInsightsSectionNav activeCount={activeCount} />
      <LocationProbe />
    </MemoryRouter>
  );
}

describe('SeoInsightsSectionNav', () => {
  it('shows the active section in the mobile select', () => {
    renderNav('/admin/seo-insights/portfolio');

    const select = screen.getByTestId('seo-insights-section-select') as HTMLSelectElement;
    expect(select.value).toBe('/admin/seo-insights/portfolio');
    expect(screen.getByRole('option', { name: 'Portfolio' })).toHaveProperty('selected', true);
  });

  it('navigates when the mobile select changes', async () => {
    const user = userEvent.setup();
    renderNav('/admin/seo-insights/portfolio');

    await user.selectOptions(
      screen.getByTestId('seo-insights-section-select'),
      '/admin/seo-insights/proposals'
    );

    expect(screen.getByTestId('seo-nav-pathname')).toHaveTextContent('/admin/seo-insights/proposals');
    expect(screen.getByTestId('seo-insights-section-select')).toHaveValue('/admin/seo-insights/proposals');
  });

  it('keeps the desktop nav links available alongside the mobile selector', () => {
    renderNav('/admin/seo-insights');

    expect(screen.getByRole('navigation', { name: 'SEO insights sections' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /insights/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /portfolio/i })).toHaveAttribute('href', '/admin/seo-insights/portfolio');
    expect(screen.getByTestId('seo-insights-nav-active-count')).toHaveTextContent('10');
  });
});
