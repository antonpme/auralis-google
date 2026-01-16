import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/userinfo.email',
];

interface TokenData {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  email: string;
}

interface TokenStore {
  [accountId: string]: TokenData;
}

const TOKENS_PATH = process.env.TOKENS_PATH || './data/tokens.json';

export class AuthManager {
  private oauth2Client: OAuth2Client;
  private tokens: TokenStore = {};

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    this.loadTokens();
  }

  private loadTokens(): void {
    try {
      if (fs.existsSync(TOKENS_PATH)) {
        const data = fs.readFileSync(TOKENS_PATH, 'utf-8');
        this.tokens = JSON.parse(data);
        // Loaded silently - stdio mode can't have console output
      }
    } catch (error) {
      console.error('Failed to load tokens:', error);
      this.tokens = {};
    }
  }

  private saveTokens(): void {
    try {
      const dir = path.dirname(TOKENS_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(TOKENS_PATH, JSON.stringify(this.tokens, null, 2));
    } catch (error) {
      console.error('Failed to save tokens:', error);
    }
  }

  getAuthUrl(accountId: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      state: accountId,
    });
  }

  async handleCallback(code: string, accountId: string): Promise<string> {
    const { tokens } = await this.oauth2Client.getToken(code);
    
    // Get user email
    this.oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email || accountId;

    this.tokens[accountId] = {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token!,
      expiry_date: tokens.expiry_date!,
      email,
    };

    this.saveTokens();
    return email;
  }

  async getClient(accountId?: string): Promise<OAuth2Client> {
    const id = accountId || Object.keys(this.tokens)[0];
    
    if (!id || !this.tokens[id]) {
      throw new Error(`Account not found: ${accountId}. Available: ${Object.keys(this.tokens).join(', ')}`);
    }

    const tokenData = this.tokens[id];
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: tokenData.expiry_date,
    });

    // Auto-refresh if expired
    if (tokenData.expiry_date < Date.now()) {
      const { credentials } = await client.refreshAccessToken();
      this.tokens[id] = {
        ...tokenData,
        access_token: credentials.access_token!,
        expiry_date: credentials.expiry_date!,
      };
      this.saveTokens();
      client.setCredentials(credentials);
    }

    return client;
  }

  getAccounts(): Array<{ id: string; email: string }> {
    return Object.entries(this.tokens).map(([id, data]) => ({
      id,
      email: data.email,
    }));
  }

  removeAccount(accountId: string): boolean {
    if (this.tokens[accountId]) {
      delete this.tokens[accountId];
      this.saveTokens();
      return true;
    }
    return false;
  }
}

export const auth = new AuthManager();
