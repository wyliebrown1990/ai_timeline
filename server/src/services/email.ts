import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';

let sesClient: SESClient | null = null;

function getSesClient(): SESClient {
  if (!sesClient) {
    sesClient = new SESClient({ region: AWS_REGION });
  }
  return sesClient;
}

export interface SendEmailInput {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string[];
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  await getSesClient().send(new SendEmailCommand({
    Source: input.from,
    Destination: {
      ToAddresses: input.to,
    },
    ReplyToAddresses: input.replyTo,
    Message: {
      Subject: {
        Data: input.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: input.text,
          Charset: 'UTF-8',
        },
        ...(input.html
          ? {
              Html: {
                Data: input.html,
                Charset: 'UTF-8',
              },
            }
          : {}),
      },
    },
  }));
}

export function normalizeEmailError(error: unknown): { code: string; message: string; retryable: boolean } {
  if (error instanceof Error) {
    return {
      code: error.name || 'EmailError',
      message: error.message,
      retryable: error.name !== 'MessageRejected',
    };
  }

  return {
    code: 'EmailError',
    message: 'Unknown email error',
    retryable: true,
  };
}

export function resetEmailClientForTests() {
  sesClient = null;
}
