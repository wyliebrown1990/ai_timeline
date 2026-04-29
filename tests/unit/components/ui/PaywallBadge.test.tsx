import { render, screen } from '@testing-library/react';
import { PaywallBadge } from '../../../../src/components/ui/PaywallBadge';

describe('PaywallBadge', () => {
  it('renders the visible "Paywalled" text', () => {
    render(<PaywallBadge />);
    expect(screen.getByText('Paywalled')).toBeInTheDocument();
  });

  it('uses admin chip classes by default', () => {
    const { container } = render(<PaywallBadge />);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('rounded');
    expect(badge?.className).toContain('bg-amber-100');
    expect(badge?.className).not.toContain('rounded-full');
  });

  it('switches to rounded-full + opacity bg with variant="feed"', () => {
    const { container } = render(<PaywallBadge variant="feed" />);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('rounded-full');
    expect(badge?.className).toContain('bg-amber-500/10');
  });

  it('exposes paywallReason in the title only when showReasonInTooltip is true', () => {
    const { rerender, container } = render(
      <PaywallBadge paywallReason="extension_overlay" showReasonInTooltip />
    );
    expect(container.querySelector('span')?.getAttribute('title')).toBe(
      'Paywalled — reason: extension_overlay'
    );

    rerender(<PaywallBadge paywallReason="extension_overlay" />);
    expect(container.querySelector('span')?.getAttribute('title')).toBe('Paywalled');
  });

  it('compact mode hides the visible text on narrow viewports via sr-only', () => {
    render(<PaywallBadge compact />);
    const text = screen.getByText('Paywalled');
    expect(text.className).toContain('sr-only');
  });

  it('compact mode adds an aria-label so screen readers still announce', () => {
    const { container } = render(<PaywallBadge compact />);
    expect(container.querySelector('span')?.getAttribute('aria-label')).toBe('Paywalled');
  });
});
