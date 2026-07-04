import axios from 'axios';
import { getEnv } from '../config/env';
import { logger } from './logger';
import { auditLog } from './audit';
import { SendEmailInput } from './email.types';


/**
 * Dispatches an email using the Zoho ZeptoMail HTTPS REST API.
 */
export async function sendViaZeptoMail(input: SendEmailInput): Promise<void> {
  const env = getEnv();
  const token = env.ZEPTOMAIL_API_TOKEN;
  const url = env.ZEPTOMAIL_API_URL;

  if (!token) {
    const errorMsg = 'ZEPTOMAIL_CONFIGURATION_INVALID: ZEPTOMAIL_API_TOKEN is missing.';
    logger.error({ to: input.to, subject: input.subject }, errorMsg);
    throw new Error(errorMsg);
  }

  // Parse sender name and email from MAIL_FROM (supports "Name <email>" format or plain email)
  let fromAddress = env.MAIL_FROM || 'noreply@mad.esparex.in';
  let fromName = 'MAD Entertrainment';

  const mailFromRegex = /(.*)<(.*)>/;
  const match = fromAddress.match(mailFromRegex);
  if (match) {
    fromName = match[1].trim();
    fromAddress = match[2].trim();
  }

  // Format recipient list
  const toRecipient = {
    email_address: {
      address: input.to,
      name: input.to.split('@')[0] || 'Attendee',
    },
  };

  // Convert attachment buffers to Base64 strings
  const formattedAttachments = input.attachments?.map((att) => ({
    content: att.content.toString('base64'),
    mime_type: att.contentType || 'application/octet-stream',
    name: att.filename,
  })) || [];

  // Build JSON request payload
  const requestBody: any = {
    from: {
      address: fromAddress,
      name: fromName,
    },
    to: [toRecipient],
    subject: input.subject,
    htmlbody: input.html,
  };

  if (formattedAttachments.length > 0) {
    requestBody.attachments = formattedAttachments;
  }

  if (env.EMAIL_REPLY_TO) {
    requestBody.reply_to = [
      {
        address: env.EMAIL_REPLY_TO,
        name: 'Support Team',
      },
    ];
  }

  if (input.messageId) {
    requestBody.mime_headers = {
      'Message-ID': input.messageId,
    };
  }

  // Handle bearer prefixing dynamically
  const authHeader = token.startsWith('Zoho-enczapikey') ? token : `Zoho-enczapikey ${token}`;

  try {
    logger.info({ to: input.to, subject: input.subject }, 'Sending transactional email via ZeptoMail API...');
    const response = await axios.post(url, requestBody, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    const successLog = {
      recipient: input.to,
      subject: input.subject,
      status: response.status,
      body: response.data,
    };

    logger.info(successLog, 'ZEPTOMAIL_DELIVERY_SUCCESS');

    auditLog({
      action: 'ZEPTOMAIL_DELIVERY_SUCCESS',
      status: 'success',
      description: `Email delivered successfully via ZeptoMail API to ${input.to}`,
      metadata: {
        recipient: input.to,
        subject: input.subject,
        statusCode: response.status,
      },
    });
  } catch (err: any) {
    const errorBody = err.response ? err.response.data : null;
    const status = err.response ? err.response.status : 500;

    const failureLog = {
      error: err.message,
      recipient: input.to,
      subject: input.subject,
      status,
      body: errorBody,
    };

    logger.error(failureLog, 'ZEPTOMAIL_DELIVERY_FAILURE');

    auditLog({
      action: 'ZEPTOMAIL_DELIVERY_FAILURE',
      status: 'failure',
      description: `Email delivery failed via ZeptoMail API to ${input.to}: ${err.message}`,
      metadata: {
        recipient: input.to,
        subject: input.subject,
        statusCode: status,
        errorBody: errorBody ? JSON.stringify(errorBody) : null,
      },
    });

    throw err; // Throw to trigger worker queue retry logic
  }
}
