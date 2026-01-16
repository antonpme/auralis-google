import { google } from 'googleapis';
import { auth } from '../auth.js';

export async function searchGmail(params: {
  account?: string;
  query: string;
  maxResults?: number;
}) {
  const client = await auth.getClient(params.account);
  const gmail = google.gmail({ version: 'v1', auth: client });

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: params.query,
    maxResults: params.maxResults || 20,
  });

  const messages = response.data.messages || [];
  
  // Fetch message details
  const detailed = await Promise.all(
    messages.slice(0, 10).map(async (msg) => {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      });

      const headers = detail.data.payload?.headers || [];
      const getHeader = (name: string) => 
        headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

      return {
        id: msg.id,
        threadId: msg.threadId,
        from: getHeader('From'),
        to: getHeader('To'),
        subject: getHeader('Subject'),
        date: getHeader('Date'),
        snippet: detail.data.snippet,
        labelIds: detail.data.labelIds,
      };
    })
  );

  return {
    total: response.data.resultSizeEstimate,
    messages: detailed,
  };
}

export async function readGmail(params: {
  account?: string;
  messageId: string;
}) {
  const client = await auth.getClient(params.account);
  const gmail = google.gmail({ version: 'v1', auth: client });

  const response = await gmail.users.messages.get({
    userId: 'me',
    id: params.messageId,
    format: 'full',
  });

  const headers = response.data.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

  // Extract body
  let body = '';
  const payload = response.data.payload;
  
  if (payload?.body?.data) {
    body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
  } else if (payload?.parts) {
    const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
    }
  }

  return {
    id: response.data.id,
    threadId: response.data.threadId,
    from: getHeader('From'),
    to: getHeader('To'),
    subject: getHeader('Subject'),
    date: getHeader('Date'),
    body,
    labelIds: response.data.labelIds,
  };
}

export async function sendGmail(params: {
  account?: string;
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}) {
  const client = await auth.getClient(params.account);
  const gmail = google.gmail({ version: 'v1', auth: client });

  // Encode subject for UTF-8 (handles emojis and special chars)
  const encodedSubject = `=?UTF-8?B?${Buffer.from(params.subject).toString('base64')}?=`;

  const messageParts = [
    `To: ${params.to}`,
    `Subject: ${encodedSubject}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
  ];

  if (params.cc) messageParts.splice(1, 0, `Cc: ${params.cc}`);
  if (params.bcc) messageParts.splice(1, 0, `Bcc: ${params.bcc}`);

  const message = [...messageParts, '', params.body].join('\r\n');
  const encodedMessage = Buffer.from(message).toString('base64url');

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });

  return {
    id: response.data.id,
    threadId: response.data.threadId,
    sent: true,
  };
}

export async function listLabels(params: { account?: string }) {
  const client = await auth.getClient(params.account);
  const gmail = google.gmail({ version: 'v1', auth: client });

  const response = await gmail.users.labels.list({
    userId: 'me',
  });

  return response.data.labels || [];
}
