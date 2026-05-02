import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SeoEditorialSeedDrawer } from '../../../../src/components/admin/SeoEditorialSeedDrawer';

describe('SeoEditorialSeedDrawer', () => {
  it('supports keyboard entry and submits normalized values', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <SeoEditorialSeedDrawer
        open
        onClose={onClose}
        onSubmit={onSubmit}
        isSubmitting={false}
      />
    );

    const closeButton = screen.getAllByRole('button', { name: /close drawer/i })[1];
    await waitFor(() => {
      expect(closeButton).toHaveFocus();
    });

    await user.tab();
    expect(screen.getByLabelText(/keyword/i)).toHaveFocus();

    await user.type(screen.getByLabelText(/keyword/i), '  ai agent memory  ');
    await user.tab();
    expect(screen.getByLabelText(/recommended page type/i)).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText(/target url/i)).toHaveFocus();
    await user.type(screen.getByLabelText(/target url/i), '  /blog/ai-agent-memory  ');
    await user.clear(screen.getByLabelText(/why this belongs in the backlog/i));
    await user.type(screen.getByLabelText(/why this belongs in the backlog/i), '  Manual seed from strategy review.  ');

    const submitButton = screen.getByRole('button', { name: /add seed/i });
    expect(submitButton).toBeEnabled();

    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        seedQuery: 'ai agent memory',
        targetUrl: '/blog/ai-agent-memory',
        rationale: 'Manual seed from strategy review.',
      }));
    });
  });

  it('shows inline validation and keeps submit disabled while invalid', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <SeoEditorialSeedDrawer
        open
        onClose={onClose}
        onSubmit={onSubmit}
        isSubmitting={false}
      />
    );

    const submitButton = screen.getByRole('button', { name: /add seed/i });
    expect(submitButton).toBeDisabled();

    const keywordInput = screen.getByLabelText(/keyword/i);
    await user.click(keywordInput);
    await user.tab();

    expect(await screen.findByText('Keyword is required.')).toBeInTheDocument();

    const targetUrlInput = screen.getByLabelText(/target url/i);
    await user.type(targetUrlInput, 'https://example.com/topic');
    await user.tab();

    expect(await screen.findByText('Use a relative path like /blog/ai-agent-memory or a letaiexplainai.com URL.')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <SeoEditorialSeedDrawer
        open
        onClose={onClose}
        onSubmit={onSubmit}
        isSubmitting={false}
      />
    );

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
