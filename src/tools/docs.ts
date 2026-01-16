import { google } from 'googleapis';
import { auth } from '../auth.js';

export async function readGoogleDoc(params: {
  account?: string;
  documentId: string;
}) {
  const client = await auth.getClient(params.account);
  const docs = google.docs({ version: 'v1', auth: client });

  const response = await docs.documents.get({
    documentId: params.documentId,
  });

  // Extract plain text from document
  let content = '';
  const body = response.data.body?.content || [];
  
  for (const element of body) {
    if (element.paragraph) {
      for (const elem of element.paragraph.elements || []) {
        if (elem.textRun?.content) {
          content += elem.textRun.content;
        }
      }
    }
  }

  return {
    documentId: response.data.documentId,
    title: response.data.title,
    content,
    revisionId: response.data.revisionId,
  };
}

export async function appendToGoogleDoc(params: {
  account?: string;
  documentId: string;
  text: string;
}) {
  const client = await auth.getClient(params.account);
  const docs = google.docs({ version: 'v1', auth: client });

  // Get document to find end index
  const doc = await docs.documents.get({
    documentId: params.documentId,
  });

  const body = doc.data.body;
  const endIndex = (body?.content?.slice(-1)[0]?.endIndex || 1) - 1;

  const response = await docs.documents.batchUpdate({
    documentId: params.documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: endIndex },
            text: params.text,
          },
        },
      ],
    },
  });

  return {
    documentId: params.documentId,
    appended: true,
    replies: response.data.replies?.length || 0,
  };
}

export async function createGoogleDoc(params: {
  account?: string;
  title: string;
  content?: string;
}) {
  const client = await auth.getClient(params.account);
  const docs = google.docs({ version: 'v1', auth: client });

  // Create empty doc
  const createResponse = await docs.documents.create({
    requestBody: {
      title: params.title,
    },
  });

  const documentId = createResponse.data.documentId!;

  // Add content if provided
  if (params.content) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: params.content,
            },
          },
        ],
      },
    });
  }

  return {
    documentId,
    title: createResponse.data.title,
    created: true,
  };
}
