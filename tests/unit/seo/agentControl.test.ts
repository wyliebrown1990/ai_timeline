import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-ssm', () => ({
  SSMClient: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  GetParameterCommand: jest.fn().mockImplementation((input: unknown) => input),
  PutParameterCommand: jest.fn().mockImplementation((input: unknown) => input),
}));

import {
  isPaused,
  resetAgentControlCacheForTests,
  setPaused,
} from '../../../server/src/services/seo/agentControl';

describe('agentControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAgentControlCacheForTests();
  });

  it('returns true when the pause flag is set in SSM', async () => {
    mockSend.mockResolvedValue({
      Parameter: {
        Value: 'true',
      },
    });

    await expect(isPaused()).resolves.toBe(true);
  });

  it('caches the pause value for sixty seconds', async () => {
    mockSend.mockResolvedValue({
      Parameter: {
        Value: 'false',
      },
    });

    await expect(isPaused(1_000)).resolves.toBe(false);
    await expect(isPaused(30_000)).resolves.toBe(false);

    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('refreshes the cache after the ttl expires', async () => {
    mockSend
      .mockResolvedValueOnce({
        Parameter: {
          Value: 'false',
        },
      })
      .mockResolvedValueOnce({
        Parameter: {
          Value: 'true',
        },
      });

    await expect(isPaused(1_000)).resolves.toBe(false);
    await expect(isPaused(62_000)).resolves.toBe(true);

    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('writes the pause state back to SSM and refreshes the cache', async () => {
    mockSend.mockResolvedValue({});

    await expect(setPaused(true, 1_000)).resolves.toBe(true);
    await expect(isPaused(30_000)).resolves.toBe(true);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith({
      Name: '/ai-timeline/prod/seo-agent-paused',
      Type: 'String',
      Overwrite: true,
      Value: 'true',
    });
  });
});
