import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Drawer } from '../../../../src/components/ui';

function DrawerHarness() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open drawer
      </button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="SEO opportunity"
        description="Review the live keyword evidence"
      >
        <div className="space-y-4 p-4">
          <button type="button">Primary action</button>
          <input aria-label="Keyword" />
          <button type="button">Archive</button>
        </div>
      </Drawer>
    </div>
  );
}

describe('Drawer', () => {
  it('traps focus inside the open drawer and restores focus when it closes', async () => {
    const user = userEvent.setup();

    render(<DrawerHarness />);

    const trigger = screen.getByRole('button', { name: /open drawer/i });
    trigger.focus();
    await user.click(trigger);

    const dialog = await screen.findByRole('dialog', { name: /seo opportunity/i });
    expect(dialog).toHaveAttribute('aria-describedby');

    const closeButtons = within(dialog).getAllByRole('button', { name: /close drawer/i });
    const closeButton = closeButtons[1];

    await waitFor(() => {
      expect(closeButton).toHaveFocus();
    });

    await user.tab();
    expect(screen.getByRole('button', { name: /primary action/i })).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText(/keyword/i)).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: /archive/i })).toHaveFocus();

    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('button', { name: /archive/i })).toHaveFocus();

    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /seo opportunity/i })).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });
});
