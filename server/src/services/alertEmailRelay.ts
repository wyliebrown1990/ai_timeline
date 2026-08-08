import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { sendEmail } from './email';

const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const RECIPIENT_PARAM =
  process.env.ALERT_EMAIL_PARAM ?? '/ai-timeline/prod/alert-email';
const SENDER_PARAM =
  process.env.ALERT_SENDER_EMAIL_PARAM ?? '/ai-timeline/prod/seo-editorial-sender-email';

let ssmClient: SSMClient | null = null;

function getSsmClient(): SSMClient {
  if (!ssmClient) {
    ssmClient = new SSMClient({ region: AWS_REGION });
  }
  return ssmClient;
}

async function getRequiredParameter(name: string): Promise<string> {
  const response = await getSsmClient().send(new GetParameterCommand({ Name: name }));
  const value = response.Parameter?.Value?.trim();
  if (!value) {
    throw new Error(`Missing required alert email parameter ${name}`);
  }
  return value;
}

export interface AlertRelayMessage {
  message: string;
  messageId: string;
  subject?: string;
  timestamp?: string;
  topicArn?: string;
}

export function buildAlertRelayEmail(alert: AlertRelayMessage): {
  subject: string;
  text: string;
} {
  const originalSubject = alert.subject?.trim() || 'AWS notification';
  const subject = `[AI Timeline Alert] ${originalSubject}`.slice(0, 255);
  const metadata = [
    alert.timestamp ? `Published: ${alert.timestamp}` : null,
    alert.topicArn ? `Topic: ${alert.topicArn}` : null,
    `Message ID: ${alert.messageId}`,
  ].filter((value): value is string => Boolean(value));

  return {
    subject,
    text: [
      originalSubject,
      '',
      alert.message,
      '',
      ...metadata,
      '',
      'Delivered by the AI Timeline protected SNS-to-SES alert relay.',
    ].join('\n'),
  };
}

export async function relayAlertEmails(alerts: AlertRelayMessage[]): Promise<{
  sentCount: number;
}> {
  if (alerts.length === 0) {
    return { sentCount: 0 };
  }

  const [recipient, sender] = await Promise.all([
    getRequiredParameter(RECIPIENT_PARAM),
    getRequiredParameter(SENDER_PARAM),
  ]);

  for (const alert of alerts) {
    const email = buildAlertRelayEmail(alert);
    await sendEmail({
      from: sender,
      to: [recipient],
      subject: email.subject,
      text: email.text,
    });
  }

  return { sentCount: alerts.length };
}

export function resetAlertEmailRelayForTests(): void {
  ssmClient = null;
}
