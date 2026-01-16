# Auralis Google

**MCP server for Google Workspace integration with Claude AI**

[![npm version](https://img.shields.io/npm/v/auralis-google.svg)](https://www.npmjs.com/package/auralis-google)
![Tools](https://img.shields.io/badge/tools-22-blue)
![Google APIs](https://img.shields.io/badge/Google%20APIs-5-red)
![License](https://img.shields.io/badge/license-MIT-green)

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/auralis-google?referralCode=auralis)

Auralis Google provides seamless integration between Claude AI and Google Workspace services through the Model Context Protocol (MCP). Access Gmail, Calendar, Drive, Docs, and Sheets directly from Claude.

## Features

- **Gmail**: Search messages, read emails, send emails, manage labels
- **Calendar**: List events, create/update/delete events, list calendars
- **Drive**: List files, search, read content, create/delete files and folders
- **Docs**: Read documents, append text, create new docs
- **Sheets**: Full spreadsheet management - read, write, append, delete rows, manage sheets

## Installation

### Option 1: npm (Recommended)

```bash
npm install -g auralis-google
```

### Option 2: Docker

```bash
docker pull antonpme/auralis-google
docker run -p 3000:3000 \
  -e GOOGLE_CLIENT_ID=your_client_id \
  -e GOOGLE_CLIENT_SECRET=your_client_secret \
  -e GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback \
  antonpme/auralis-google
```

### Option 3: Clone and Build

```bash
git clone https://github.com/antonpme/auralis-google.git
cd auralis-google
npm install
npm run build
```

## Google Cloud Setup

Before using Auralis Google, you need to create OAuth credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Gmail API
   - Google Calendar API
   - Google Drive API
   - Google Docs API
   - Google Sheets API
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Select **Web application**
6. Add authorized redirect URI: `http://localhost:3000/oauth/callback`
7. Copy **Client ID** and **Client Secret**

## Configuration

### Claude Desktop (stdio mode)

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "google": {
      "command": "auralis-google",
      "env": {
        "MCP_MODE": "stdio",
        "GOOGLE_CLIENT_ID": "your_client_id.apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "your_client_secret",
        "GOOGLE_REDIRECT_URI": "http://localhost:3000/oauth/callback"
      }
    }
  }
}
```

### HTTP Mode (Railway/Docker)

Set these environment variables:

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `MCP_MODE` | Set to `http` for HTTP mode (default) |
| `GOOGLE_CLIENT_ID` | OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL |
| `TOKENS_PATH` | Path to store tokens (default: `./data/tokens.json`) |

**HTTP Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp` | POST | MCP protocol endpoint (Streamable HTTP) |
| `/auth?account=xxx` | GET | Start OAuth flow for account |
| `/oauth/callback` | GET | OAuth callback handler |
| `/health` | GET | Health check |

## Authentication

On first use, you need to authenticate with Google:

**HTTP Mode:**
1. Open `http://localhost:3000/auth?account=personal` in browser
2. Sign in with your Google account
3. Grant permissions
4. You'll see "✅ Authenticated as your@email.com"

**Stdio Mode:**
You'll need to run the server in HTTP mode first to complete OAuth, then switch to stdio.

### Multiple Accounts

You can authenticate multiple Google accounts:

```
/auth?account=personal
/auth?account=work
/auth?account=client
```

Then specify the account when using tools:

```json
{
  "account": "work",
  "query": "is:unread"
}
```

## Tools Reference

### Account Management

| Tool | Description |
|------|-------------|
| `google_list_accounts` | List all authenticated Google accounts |

### Gmail (4 tools)

| Tool | Description |
|------|-------------|
| `google_gmail_search` | Search Gmail messages with query |
| `google_gmail_read` | Read a specific email by ID |
| `google_gmail_send` | Send an email |
| `google_gmail_labels` | List Gmail labels |

### Calendar (5 tools)

| Tool | Description |
|------|-------------|
| `google_calendar_list` | List all calendars |
| `google_calendar_list_events` | List events with optional time filter |
| `google_calendar_create_event` | Create a new event |
| `google_calendar_update_event` | Update an existing event |
| `google_calendar_delete_event` | Delete an event |

### Drive (8 tools)

| Tool | Description |
|------|-------------|
| `google_drive_list` | List files in Drive or folder |
| `google_drive_search` | Search files by content |
| `google_drive_get` | Get file metadata |
| `google_drive_read` | Read file content (text/Google Docs) |
| `google_drive_create` | Create a new file |
| `google_drive_delete` | Delete a file |
| `google_drive_create_folder` | Create a folder |
| `google_drive_move` | Move file to another folder |

### Docs (3 tools)

| Tool | Description |
|------|-------------|
| `google_docs_read` | Read a Google Doc |
| `google_docs_append` | Append text to a Doc |
| `google_docs_create` | Create a new Google Doc |

### Sheets (10 tools)

| Tool | Description |
|------|-------------|
| `google_sheets_create` | Create a new spreadsheet |
| `google_sheets_read` | Read data from range |
| `google_sheets_append` | Append rows to sheet |
| `google_sheets_update` | Update cells in range |
| `google_sheets_info` | Get spreadsheet metadata |
| `google_sheets_delete_rows` | Delete rows |
| `google_sheets_clear` | Clear cells in range |
| `google_sheets_add_sheet` | Add new sheet tab |
| `google_sheets_delete_sheet` | Delete sheet tab |
| `google_sheets_rename_sheet` | Rename sheet tab |

## Usage Examples

### Search unread emails

```
Search my Gmail for unread messages from last week
```

### Create calendar event

```
Create a meeting called "Project Review" tomorrow at 3pm for 1 hour
```

### Read spreadsheet data

```
Read all data from my Budget spreadsheet
```

### Send email

```
Send an email to john@example.com with subject "Meeting Notes" and the summary of our discussion
```

## Railway Deployment

1. Fork this repository
2. Connect to Railway
3. Set environment variables in Railway dashboard
4. Deploy

Or use the railway.json included in this repo.

## Architecture

```
auralis-google/
├── src/
│   ├── index.ts      # MCP server + Express endpoints
│   ├── auth.ts       # OAuth2 management
│   └── tools/
│       ├── gmail.ts
│       ├── calendar.ts
│       ├── drive.ts
│       ├── docs.ts
│       └── sheets.ts
├── dist/             # Compiled JavaScript
├── data/             # Token storage (gitignored)
├── Dockerfile
├── railway.json
└── package.json
```

## Security

- OAuth tokens are stored locally in `./data/tokens.json`
- Tokens are automatically refreshed when expired
- Never commit your `data/` folder or `.env` files
- Use environment variables for credentials

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT License - see [LICENSE](LICENSE) file.

## Links

- [GitHub Repository](https://github.com/antonpme/auralis-google)
- [NPM Package](https://www.npmjs.com/package/auralis-google)
- [Auralis Commander](https://github.com/antonpme/auralis-commander) - Windows MCP server
