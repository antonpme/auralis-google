import { google } from 'googleapis';
import { auth } from '../auth.js';

export async function createSpreadsheet(params: {
  account?: string;
  title: string;
  sheetTitle?: string;
  headers?: string[];
}) {
  const client = await auth.getClient(params.account);
  const sheets = google.sheets({ version: 'v4', auth: client });

  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: params.title,
      },
      sheets: [
        {
          properties: {
            title: params.sheetTitle || 'Sheet1',
          },
        },
      ],
    },
  });

  const spreadsheetId = response.data.spreadsheetId!;

  // Add headers if provided
  if (params.headers && params.headers.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${params.sheetTitle || 'Sheet1'}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [params.headers],
      },
    });
  }

  return {
    spreadsheetId,
    title: response.data.properties?.title,
    sheetTitle: params.sheetTitle || 'Sheet1',
    url: response.data.spreadsheetUrl,
    created: true,
  };
}

export async function readSheet(params: {
  account?: string;
  spreadsheetId: string;
  range?: string;
}) {
  const client = await auth.getClient(params.account);
  const sheets = google.sheets({ version: 'v4', auth: client });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: params.spreadsheetId,
    range: params.range || 'Sheet1',
  });

  return {
    spreadsheetId: params.spreadsheetId,
    range: response.data.range,
    values: response.data.values || [],
    rowCount: response.data.values?.length || 0,
  };
}

export async function appendRows(params: {
  account?: string;
  spreadsheetId: string;
  range?: string;
  values: string[][];
}) {
  const client = await auth.getClient(params.account);
  const sheets = google.sheets({ version: 'v4', auth: client });

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: params.spreadsheetId,
    range: params.range || 'Sheet1',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: params.values,
    },
  });

  return {
    spreadsheetId: params.spreadsheetId,
    updatedRange: response.data.updates?.updatedRange,
    updatedRows: response.data.updates?.updatedRows,
    updatedCells: response.data.updates?.updatedCells,
    appended: true,
  };
}

export async function updateCells(params: {
  account?: string;
  spreadsheetId: string;
  range: string;
  values: string[][];
}) {
  const client = await auth.getClient(params.account);
  const sheets = google.sheets({ version: 'v4', auth: client });

  const response = await sheets.spreadsheets.values.update({
    spreadsheetId: params.spreadsheetId,
    range: params.range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: params.values,
    },
  });

  return {
    spreadsheetId: params.spreadsheetId,
    updatedRange: response.data.updatedRange,
    updatedRows: response.data.updatedRows,
    updatedCells: response.data.updatedCells,
    updated: true,
  };
}

export async function getSpreadsheetInfo(params: {
  account?: string;
  spreadsheetId: string;
}) {
  const client = await auth.getClient(params.account);
  const sheets = google.sheets({ version: 'v4', auth: client });

  const response = await sheets.spreadsheets.get({
    spreadsheetId: params.spreadsheetId,
  });

  return {
    spreadsheetId: response.data.spreadsheetId,
    title: response.data.properties?.title,
    url: response.data.spreadsheetUrl,
    sheets: response.data.sheets?.map((s) => ({
      sheetId: s.properties?.sheetId,
      title: s.properties?.title,
      rowCount: s.properties?.gridProperties?.rowCount,
      columnCount: s.properties?.gridProperties?.columnCount,
    })),
  };
}

export async function deleteRows(params: {
  account?: string;
  spreadsheetId: string;
  sheetId: number;
  startIndex: number;
  endIndex: number;
}) {
  const client = await auth.getClient(params.account);
  const sheets = google.sheets({ version: 'v4', auth: client });

  const response = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: params.spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: params.sheetId,
              dimension: 'ROWS',
              startIndex: params.startIndex,
              endIndex: params.endIndex,
            },
          },
        },
      ],
    },
  });

  return {
    spreadsheetId: params.spreadsheetId,
    deletedRows: params.endIndex - params.startIndex,
    replies: response.data.replies?.length || 0,
  };
}

export async function clearRange(params: {
  account?: string;
  spreadsheetId: string;
  range: string;
}) {
  const client = await auth.getClient(params.account);
  const sheets = google.sheets({ version: 'v4', auth: client });

  const response = await sheets.spreadsheets.values.clear({
    spreadsheetId: params.spreadsheetId,
    range: params.range,
  });

  return {
    spreadsheetId: params.spreadsheetId,
    clearedRange: response.data.clearedRange,
    cleared: true,
  };
}

export async function addSheet(params: {
  account?: string;
  spreadsheetId: string;
  title: string;
}) {
  const client = await auth.getClient(params.account);
  const sheets = google.sheets({ version: 'v4', auth: client });

  const response = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: params.spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: params.title,
            },
          },
        },
      ],
    },
  });

  const newSheet = response.data.replies?.[0]?.addSheet?.properties;

  return {
    spreadsheetId: params.spreadsheetId,
    sheetId: newSheet?.sheetId,
    title: newSheet?.title,
    added: true,
  };
}

export async function deleteSheet(params: {
  account?: string;
  spreadsheetId: string;
  sheetId: number;
}) {
  const client = await auth.getClient(params.account);
  const sheets = google.sheets({ version: 'v4', auth: client });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: params.spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteSheet: {
            sheetId: params.sheetId,
          },
        },
      ],
    },
  });

  return {
    spreadsheetId: params.spreadsheetId,
    sheetId: params.sheetId,
    deleted: true,
  };
}

export async function renameSheet(params: {
  account?: string;
  spreadsheetId: string;
  sheetId: number;
  newTitle: string;
}) {
  const client = await auth.getClient(params.account);
  const sheets = google.sheets({ version: 'v4', auth: client });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: params.spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId: params.sheetId,
              title: params.newTitle,
            },
            fields: 'title',
          },
        },
      ],
    },
  });

  return {
    spreadsheetId: params.spreadsheetId,
    sheetId: params.sheetId,
    newTitle: params.newTitle,
    renamed: true,
  };
}
