import { describe, expect, it } from '@jest/globals';
import { buildAlertRelayEmail } from '../../../server/src/services/alertEmailRelay';

describe('alertEmailRelay', () => {
  it('preserves the alarm payload and delivery metadata', () => {
    const email = buildAlertRelayEmail({
      message: '{"AlarmName":"ai-timeline-quiz-generation-failed-prod"}',
      messageId: 'message-123',
      subject: 'ALARM: quiz generation failed',
      timestamp: '2026-07-17T19:30:00.000Z',
      topicArn: 'arn:aws:sns:us-east-1:211125652144:ai-timeline-alerts-prod',
    });

    expect(email.subject).toBe('[AI Timeline Alert] ALARM: quiz generation failed');
    expect(email.text).toContain('ai-timeline-quiz-generation-failed-prod');
    expect(email.text).toContain('Published: 2026-07-17T19:30:00.000Z');
    expect(email.text).toContain('Message ID: message-123');
    expect(email.text).toContain('protected SNS-to-SES alert relay');
  });

  it('limits SES subjects to 255 characters', () => {
    const email = buildAlertRelayEmail({
      message: 'test',
      messageId: 'message-456',
      subject: 'x'.repeat(300),
    });

    expect(email.subject).toHaveLength(255);
  });
});
