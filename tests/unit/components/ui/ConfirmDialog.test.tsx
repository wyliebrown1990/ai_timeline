import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../../../../src/components/ui/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('traps focus inside the dialog', async () => {
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        isOpen
        title="Queue this proposal?"
        message="Confirm the next step."
        confirmLabel="Queue proposal"
        cancelLabel="Keep reviewing"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const closeButton = screen.getByRole('button', { name: /close dialog/i });
    const cancelButton = screen.getByRole('button', { name: /keep reviewing/i });
    const confirmButton = screen.getByRole('button', { name: /queue proposal/i });

    expect(cancelButton).toHaveFocus();

    await user.tab();
    expect(confirmButton).toHaveFocus();

    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.tab();
    expect(cancelButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(closeButton).toHaveFocus();
  });

  it('closes on escape', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();

    render(
      <ConfirmDialog
        isOpen
        title="Queue this proposal?"
        message="Confirm the next step."
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
