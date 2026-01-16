#!/usr/bin/env node
import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { auth } from './auth.js';
import * as gmail from './tools/gmail.js';
import * as calendar from './tools/calendar.js';
import * as drive from './tools/drive.js';
import * as docs from './tools/docs.js';
import * as sheets from './tools/sheets.js';

const PORT = process.env.PORT || 3000;
const isHttpMode = process.env.MCP_MODE !== 'stdio';

// Create MCP server
function createServer(): McpServer {
  const server = new McpServer({
    name: 'auralis-google-mcp',
    version: '1.0.0'
  });

  // ============================================
  // Account Management
  // ============================================
  
  server.tool(
    'google_list_accounts',
    'List all authenticated Google accounts',
    {},
    async () => {
      const accounts = auth.getAccounts();
      return {
        content: [{ type: 'text', text: JSON.stringify(accounts, null, 2) }]
      };
    }
  );

  // ============================================
  // Gmail Tools
  // ============================================

  server.tool(
    'google_gmail_search',
    'Search Gmail messages',
    {
      account: z.string().optional().describe('Account ID (optional, uses first if not specified)'),
      query: z.string().describe('Gmail search query (e.g., "is:unread", "from:someone@example.com")'),
      maxResults: z.number().optional().default(20).describe('Max results (default 20)')
    },
    async (args) => {
      const result = await gmail.searchGmail(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_gmail_read',
    'Read a Gmail message by ID',
    {
      account: z.string().optional(),
      messageId: z.string().describe('Message ID')
    },
    async (args) => {
      const result = await gmail.readGmail(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_gmail_send',
    'Send an email',
    {
      account: z.string().optional(),
      to: z.string().describe('Recipient email'),
      subject: z.string(),
      body: z.string(),
      cc: z.string().optional(),
      bcc: z.string().optional()
    },
    async (args) => {
      const result = await gmail.sendGmail(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_gmail_labels',
    'List Gmail labels',
    {
      account: z.string().optional()
    },
    async (args) => {
      const result = await gmail.listLabels(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  // ============================================
  // Calendar Tools
  // ============================================

  server.tool(
    'google_calendar_list_events',
    'List calendar events',
    {
      account: z.string().optional(),
      calendarId: z.string().optional().describe('Calendar ID (default: primary)'),
      timeMin: z.string().optional().describe('Start time (ISO 8601)'),
      timeMax: z.string().optional().describe('End time (ISO 8601)'),
      maxResults: z.number().optional()
    },
    async (args) => {
      const result = await calendar.listCalendarEvents(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_calendar_create_event',
    'Create a calendar event',
    {
      account: z.string().optional(),
      calendarId: z.string().optional(),
      summary: z.string().describe('Event title'),
      description: z.string().optional(),
      location: z.string().optional(),
      start: z.string().describe('Start time (ISO 8601)'),
      end: z.string().describe('End time (ISO 8601)'),
      attendees: z.array(z.string()).optional().describe('Attendee emails'),
      timezone: z.string().optional().describe('Timezone (default: Europe/Rome)')
    },
    async (args) => {
      const result = await calendar.createCalendarEvent(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_calendar_update_event',
    'Update a calendar event',
    {
      account: z.string().optional(),
      calendarId: z.string().optional(),
      eventId: z.string(),
      summary: z.string().optional(),
      description: z.string().optional(),
      location: z.string().optional(),
      start: z.string().optional(),
      end: z.string().optional(),
      timezone: z.string().optional()
    },
    async (args) => {
      const result = await calendar.updateCalendarEvent(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_calendar_delete_event',
    'Delete a calendar event',
    {
      account: z.string().optional(),
      calendarId: z.string().optional(),
      eventId: z.string()
    },
    async (args) => {
      const result = await calendar.deleteCalendarEvent(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_calendar_list',
    'List all calendars',
    {
      account: z.string().optional()
    },
    async (args) => {
      const result = await calendar.listCalendars(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  // ============================================
  // Drive Tools
  // ============================================

  server.tool(
    'google_drive_list',
    'List files in Drive',
    {
      account: z.string().optional(),
      query: z.string().optional().describe('Drive query (e.g., "mimeType=\'application/pdf\'")'),
      folderId: z.string().optional().describe('Folder ID to list'),
      maxResults: z.number().optional()
    },
    async (args) => {
      const result = await drive.listDriveFiles(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_drive_search',
    'Search files by content',
    {
      account: z.string().optional(),
      query: z.string().describe('Search text'),
      maxResults: z.number().optional()
    },
    async (args) => {
      const result = await drive.searchDriveFiles(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_drive_get',
    'Get file metadata',
    {
      account: z.string().optional(),
      fileId: z.string()
    },
    async (args) => {
      const result = await drive.getDriveFile(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_drive_read',
    'Read file content (text files and Google Docs)',
    {
      account: z.string().optional(),
      fileId: z.string()
    },
    async (args) => {
      const result = await drive.readDriveFileContent(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_drive_create',
    'Create a new file',
    {
      account: z.string().optional(),
      name: z.string(),
      content: z.string(),
      mimeType: z.string().optional(),
      folderId: z.string().optional()
    },
    async (args) => {
      const result = await drive.createDriveFile(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_drive_delete',
    'Delete a file',
    {
      account: z.string().optional(),
      fileId: z.string()
    },
    async (args) => {
      const result = await drive.deleteDriveFile(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_drive_create_folder',
    'Create a new folder',
    {
      account: z.string().optional(),
      name: z.string().describe('Folder name'),
      parentId: z.string().optional().describe('Parent folder ID')
    },
    async (args) => {
      const result = await drive.createFolder(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_drive_move',
    'Move a file to another folder',
    {
      account: z.string().optional(),
      fileId: z.string().describe('File ID to move'),
      folderId: z.string().describe('Destination folder ID')
    },
    async (args) => {
      const result = await drive.moveFile(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  // ============================================
  // Docs Tools
  // ============================================

  server.tool(
    'google_docs_read',
    'Read a Google Doc',
    {
      account: z.string().optional(),
      documentId: z.string()
    },
    async (args) => {
      const result = await docs.readGoogleDoc(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_docs_append',
    'Append text to a Google Doc',
    {
      account: z.string().optional(),
      documentId: z.string(),
      text: z.string()
    },
    async (args) => {
      const result = await docs.appendToGoogleDoc(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_docs_create',
    'Create a new Google Doc',
    {
      account: z.string().optional(),
      title: z.string(),
      content: z.string().optional()
    },
    async (args) => {
      const result = await docs.createGoogleDoc(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  // ============================================
  // Sheets Tools
  // ============================================

  server.tool(
    'google_sheets_create',
    'Create a new Google Spreadsheet',
    {
      account: z.string().optional(),
      title: z.string().describe('Spreadsheet title'),
      sheetTitle: z.string().optional().describe('First sheet name (default: Sheet1)'),
      headers: z.array(z.string()).optional().describe('Header row values')
    },
    async (args) => {
      const result = await sheets.createSpreadsheet(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_sheets_read',
    'Read data from a spreadsheet',
    {
      account: z.string().optional(),
      spreadsheetId: z.string().describe('Spreadsheet ID'),
      range: z.string().optional().describe('Range to read (e.g., Sheet1!A1:D10)')
    },
    async (args) => {
      const result = await sheets.readSheet(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_sheets_append',
    'Append rows to a spreadsheet',
    {
      account: z.string().optional(),
      spreadsheetId: z.string().describe('Spreadsheet ID'),
      range: z.string().optional().describe('Range (default: Sheet1)'),
      values: z.array(z.array(z.string())).describe('Rows to append (array of arrays)')
    },
    async (args) => {
      const result = await sheets.appendRows(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_sheets_update',
    'Update cells in a spreadsheet',
    {
      account: z.string().optional(),
      spreadsheetId: z.string().describe('Spreadsheet ID'),
      range: z.string().describe('Range to update (e.g., Sheet1!A1:B2)'),
      values: z.array(z.array(z.string())).describe('Values to write')
    },
    async (args) => {
      const result = await sheets.updateCells(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_sheets_info',
    'Get spreadsheet info and sheet list',
    {
      account: z.string().optional(),
      spreadsheetId: z.string().describe('Spreadsheet ID')
    },
    async (args) => {
      const result = await sheets.getSpreadsheetInfo(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_sheets_delete_rows',
    'Delete rows from a spreadsheet',
    {
      account: z.string().optional(),
      spreadsheetId: z.string().describe('Spreadsheet ID'),
      sheetId: z.number().describe('Sheet ID (from sheets_info)'),
      startIndex: z.number().describe('Start row index (0-based, exclusive of header)'),
      endIndex: z.number().describe('End row index (exclusive)')
    },
    async (args) => {
      const result = await sheets.deleteRows(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_sheets_clear',
    'Clear cells in a range (keeps structure)',
    {
      account: z.string().optional(),
      spreadsheetId: z.string().describe('Spreadsheet ID'),
      range: z.string().describe('Range to clear (e.g., Sheet1!A2:G100)')
    },
    async (args) => {
      const result = await sheets.clearRange(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_sheets_add_sheet',
    'Add a new sheet tab to spreadsheet',
    {
      account: z.string().optional(),
      spreadsheetId: z.string().describe('Spreadsheet ID'),
      title: z.string().describe('New sheet name')
    },
    async (args) => {
      const result = await sheets.addSheet(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_sheets_delete_sheet',
    'Delete a sheet tab from spreadsheet',
    {
      account: z.string().optional(),
      spreadsheetId: z.string().describe('Spreadsheet ID'),
      sheetId: z.number().describe('Sheet ID to delete (from sheets_info)')
    },
    async (args) => {
      const result = await sheets.deleteSheet(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  server.tool(
    'google_sheets_rename_sheet',
    'Rename a sheet tab',
    {
      account: z.string().optional(),
      spreadsheetId: z.string().describe('Spreadsheet ID'),
      sheetId: z.number().describe('Sheet ID to rename (from sheets_info)'),
      newTitle: z.string().describe('New sheet name')
    },
    async (args) => {
      const result = await sheets.renameSheet(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  return server;
}

// ============================================
// HTTP Mode (Streamable HTTP for Claude.ai)
// ============================================

async function runHTTP() {
  const app = express();
  
  app.use(cors());
  app.use(express.json());

  const server = createServer();

  // Streamable HTTP endpoint (stateless)
  app.post('/mcp', async (req: Request, res: Response) => {
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
      });

      res.on('close', () => {
        transport.close();
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error: any) {
      console.error('[MCP] Error:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // OAuth endpoints for Google auth
  app.get('/auth', (req: Request, res: Response) => {
    const accountId = (req.query.account as string) || 'default';
    const url = auth.getAuthUrl(accountId);
    res.redirect(url);
  });

  app.get('/oauth/callback', async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string;
      const accountId = (req.query.state as string) || 'default';
      const email = await auth.handleCallback(code, accountId);
      res.send(`✅ Authenticated as ${email}. You can close this window.`);
    } catch (error: any) {
      res.status(500).send(`❌ Error: ${error.message}`);
    }
  });

  // Health check
  app.get('/health', (_: Request, res: Response) => {
    res.json({
      status: 'ok',
      version: '1.0.0',
      transport: 'streamable-http',
      accounts: auth.getAccounts().length
    });
  });

  // Root info
  app.get('/', (_: Request, res: Response) => {
    res.json({
      name: 'auralis-google-mcp',
      version: '1.0.0',
      transport: 'streamable-http',
      endpoint: 'POST /mcp',
      auth: 'GET /auth?account=xxx'
    });
  });

  app.listen(PORT, () => {
    console.log(`🚀 auralis-google-mcp v1.0.0`);
    console.log(`📡 MCP endpoint: http://localhost:${PORT}/mcp`);
    console.log(`📧 OAuth: http://localhost:${PORT}/auth?account=personal`);
  });
}

// ============================================
// Stdio Mode (for Claude Desktop)
// ============================================

async function runStdio() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Start
const transport = process.env.MCP_MODE || 'http';
if (transport === 'stdio') {
  runStdio().catch(error => {
    console.error('Server error:', error);
    process.exit(1);
  });
} else {
  runHTTP().catch(error => {
    console.error('Server error:', error);
    process.exit(1);
  });
}
