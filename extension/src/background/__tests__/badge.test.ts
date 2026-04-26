import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('service-worker badge state', () => {
  let listener: (msg: unknown, sender: unknown, sendResponse: (r: unknown) => void) => void;
  let chromeMock: {
    runtime: { onMessage: { addListener: (cb: typeof listener) => void }; onInstalled: { addListener: (cb: () => void) => void } };
    action: { setBadgeText: ReturnType<typeof vi.fn>; setBadgeBackgroundColor: ReturnType<typeof vi.fn> };
  };

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();

    chromeMock = {
      runtime: {
        onMessage: {
          addListener: (cb) => {
            listener = cb;
          },
        },
        onInstalled: {
          addListener: () => {},
        },
      },
      action: {
        setBadgeText: vi.fn(),
        setBadgeBackgroundColor: vi.fn(),
      },
    };
    (globalThis as unknown as { chrome: unknown }).chrome = chromeMock;

    await import('../service-worker');
  });

  it('shows count badge during in-flight, clears on idle', () => {
    chromeMock.action.setBadgeText.mockClear();

    listener({ type: 'SUBMIT_START' }, null, () => {});
    expect(chromeMock.action.setBadgeText).toHaveBeenCalledWith({ text: '1' });
    expect(chromeMock.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#2563eb' });

    listener({ type: 'SUBMIT_START' }, null, () => {});
    expect(chromeMock.action.setBadgeText).toHaveBeenLastCalledWith({ text: '2' });

    listener({ type: 'SUBMIT_END', ok: true }, null, () => {});
    expect(chromeMock.action.setBadgeText).toHaveBeenLastCalledWith({ text: '1' });

    listener({ type: 'SUBMIT_END', ok: true }, null, () => {});
    expect(chromeMock.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' });
  });

  it('flashes red ! on error then clears after 3s', () => {
    listener({ type: 'SUBMIT_START' }, null, () => {});
    chromeMock.action.setBadgeText.mockClear();
    chromeMock.action.setBadgeBackgroundColor.mockClear();

    listener({ type: 'SUBMIT_END', ok: false }, null, () => {});

    expect(chromeMock.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#dc2626' });
    expect(chromeMock.action.setBadgeText).toHaveBeenCalledWith({ text: '!' });

    chromeMock.action.setBadgeText.mockClear();
    vi.advanceTimersByTime(3000);
    // After 3s, badge clears (inFlight is now 0)
    expect(chromeMock.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
  });

  it('does not go negative when SUBMIT_END fires without START', () => {
    chromeMock.action.setBadgeText.mockClear();
    listener({ type: 'SUBMIT_END', ok: true }, null, () => {});
    // No exceptions, badge cleared
    expect(chromeMock.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
  });
});
