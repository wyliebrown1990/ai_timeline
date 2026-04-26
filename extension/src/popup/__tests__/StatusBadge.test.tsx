import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/StatusBadge';

describe('<StatusBadge />', () => {
  it.each([
    ['pending', 'Pending'],
    ['screening', 'Screening'],
    ['generating', 'Generating'],
    ['complete', 'Complete'],
    ['error', 'Error'],
  ])('renders %s as %s', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('falls back to pending for unknown status (defensive — color is not the only signal)', () => {
    render(<StatusBadge status="something-weird" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });
});
