/**
 * Contact Controller
 *
 * Handles contact form submissions and sends emails via AWS SES.
 */

import type { Request, Response } from 'express';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: 'us-east-1' });

const RECIPIENT_EMAIL = 'wyliebrown1990@gmail.com';
// Note: In SES sandbox mode, sender must be verified. Using same email until domain is verified.
const SENDER_EMAIL = 'wyliebrown1990@gmail.com';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

/**
 * Submit contact form
 * Sends email to site owner via AWS SES
 */
export async function submitContactForm(req: Request, res: Response) {
  try {
    const { name, email, subject, message } = req.body as ContactFormData;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    if (!subject || typeof subject !== 'string') {
      return res.status(400).json({ error: 'Subject is required' });
    }
    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      return res.status(400).json({ error: 'Message must be at least 10 characters' });
    }

    // Map subject to readable text
    const subjectLabels: Record<string, string> = {
      general: 'General Inquiry',
      feedback: 'Feedback',
      bug: 'Bug Report',
      suggestion: 'Feature Suggestion',
      content: 'Content Correction',
      other: 'Other',
    };
    const subjectLabel = subjectLabels[subject] || subject;

    // Build email content
    const emailSubject = `[AI Timeline] ${subjectLabel} from ${name.trim()}`;
    const emailBody = `
New contact form submission from AI Timeline Atlas

From: ${name.trim()}
Email: ${email.trim()}
Subject: ${subjectLabel}

Message:
${message.trim()}

---
Sent from the AI Timeline Atlas contact form
https://letaiexplainai.com/contact
    `.trim();

    // Send email via SES
    const command = new SendEmailCommand({
      Source: SENDER_EMAIL,
      Destination: {
        ToAddresses: [RECIPIENT_EMAIL],
      },
      ReplyToAddresses: [email.trim()],
      Message: {
        Subject: {
          Data: emailSubject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: emailBody,
            Charset: 'UTF-8',
          },
        },
      },
    });

    await ses.send(command);

    console.log(`[Contact] Email sent successfully from ${email}`);

    return res.json({
      success: true,
      message: 'Your message has been sent. We\'ll get back to you soon!',
    });
  } catch (error) {
    console.error('[Contact] Error sending email:', error);

    // Check for SES-specific errors
    if (error instanceof Error) {
      if (error.name === 'MessageRejected') {
        return res.status(400).json({
          error: 'Unable to send email. Please try again later.',
        });
      }
    }

    return res.status(500).json({
      error: 'Failed to send message. Please try again later.',
    });
  }
}
