import { google } from 'googleapis';
import { auth } from '../auth.js';

export async function listDriveFiles(params: {
  account?: string;
  query?: string;
  folderId?: string;
  maxResults?: number;
}) {
  const client = await auth.getClient(params.account);
  const drive = google.drive({ version: 'v3', auth: client });

  let q = params.query || '';
  if (params.folderId) {
    q = `'${params.folderId}' in parents${q ? ` and ${q}` : ''}`;
  }
  if (!q) {
    q = "trashed = false";
  }

  const response = await drive.files.list({
    q,
    pageSize: params.maxResults || 50,
    fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, parents)',
    orderBy: 'modifiedTime desc',
  });

  return (response.data.files || []).map(file => ({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size,
    createdTime: file.createdTime,
    modifiedTime: file.modifiedTime,
    webViewLink: file.webViewLink,
    parents: file.parents,
  }));
}

export async function searchDriveFiles(params: {
  account?: string;
  query: string;
  maxResults?: number;
}) {
  const client = await auth.getClient(params.account);
  const drive = google.drive({ version: 'v3', auth: client });

  const response = await drive.files.list({
    q: `fullText contains '${params.query.replace(/'/g, "\\'")}' and trashed = false`,
    pageSize: params.maxResults || 20,
    fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink)',
    orderBy: 'modifiedTime desc',
  });

  return (response.data.files || []).map(file => ({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size,
    modifiedTime: file.modifiedTime,
    webViewLink: file.webViewLink,
  }));
}

export async function getDriveFile(params: {
  account?: string;
  fileId: string;
}) {
  const client = await auth.getClient(params.account);
  const drive = google.drive({ version: 'v3', auth: client });

  const response = await drive.files.get({
    fileId: params.fileId,
    fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, description, parents, owners',
  });

  return response.data;
}

export async function readDriveFileContent(params: {
  account?: string;
  fileId: string;
}) {
  const client = await auth.getClient(params.account);
  const drive = google.drive({ version: 'v3', auth: client });

  // Get file metadata first
  const meta = await drive.files.get({
    fileId: params.fileId,
    fields: 'mimeType, name',
  });

  // For Google Docs/Sheets/Slides, export as plain text
  if (meta.data.mimeType?.startsWith('application/vnd.google-apps')) {
    const exportMime = 'text/plain';
    const response = await drive.files.export({
      fileId: params.fileId,
      mimeType: exportMime,
    }, { responseType: 'text' });
    
    return {
      name: meta.data.name,
      mimeType: meta.data.mimeType,
      content: response.data as string,
    };
  }

  // For regular files, download content
  const response = await drive.files.get({
    fileId: params.fileId,
    alt: 'media',
  }, { responseType: 'text' });

  return {
    name: meta.data.name,
    mimeType: meta.data.mimeType,
    content: response.data as string,
  };
}

export async function createDriveFile(params: {
  account?: string;
  name: string;
  content: string;
  mimeType?: string;
  folderId?: string;
}) {
  const client = await auth.getClient(params.account);
  const drive = google.drive({ version: 'v3', auth: client });

  const fileMetadata: any = {
    name: params.name,
  };

  if (params.folderId) {
    fileMetadata.parents = [params.folderId];
  }

  const media = {
    mimeType: params.mimeType || 'text/plain',
    body: params.content,
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name, webViewLink',
  });

  return {
    id: response.data.id,
    name: response.data.name,
    webViewLink: response.data.webViewLink,
    created: true,
  };
}

export async function deleteDriveFile(params: {
  account?: string;
  fileId: string;
}) {
  const client = await auth.getClient(params.account);
  const drive = google.drive({ version: 'v3', auth: client });

  await drive.files.delete({
    fileId: params.fileId,
  });

  return { deleted: true };
}

export async function createFolder(params: {
  account?: string;
  name: string;
  parentId?: string;
}) {
  const client = await auth.getClient(params.account);
  const drive = google.drive({ version: 'v3', auth: client });

  const fileMetadata: any = {
    name: params.name,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (params.parentId) {
    fileMetadata.parents = [params.parentId];
  }

  const response = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id, name, webViewLink',
  });

  return {
    id: response.data.id,
    name: response.data.name,
    webViewLink: response.data.webViewLink,
    created: true,
  };
}

export async function moveFile(params: {
  account?: string;
  fileId: string;
  folderId: string;
}) {
  const client = await auth.getClient(params.account);
  const drive = google.drive({ version: 'v3', auth: client });

  // Get current parents
  const file = await drive.files.get({
    fileId: params.fileId,
    fields: 'parents',
  });

  const previousParents = file.data.parents?.join(',') || '';

  const response = await drive.files.update({
    fileId: params.fileId,
    addParents: params.folderId,
    removeParents: previousParents,
    fields: 'id, name, parents, webViewLink',
  });

  return {
    id: response.data.id,
    name: response.data.name,
    parents: response.data.parents,
    webViewLink: response.data.webViewLink,
    moved: true,
  };
}
