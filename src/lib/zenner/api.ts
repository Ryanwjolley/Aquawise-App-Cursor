
export interface ZennerReadingRaw {
  accountId: string;
  timestamp: string; // ISO string
  readingGallons: number;
}

export interface ZennerAccountRaw {
  accountId: string;
  name: string;
  email?: string;
}

interface FetchOptions {
  mock?: boolean;
}

import { env } from '@/lib/env';

const baseUrl = env.ZENNER_BASE_URL || 'https://example-zenner.test';

function creds() {
  return {
    utility: env.ZENNER_UTILITY || '',
    user: env.ZENNER_USER || '',
    pass: env.ZENNER_PASS || ''
  };
}

export async function fetchZennerReadings(start: Date, end: Date, opts: FetchOptions = {}): Promise<ZennerReadingRaw[]> {
  if (opts.mock) {
    return [
      { accountId: 'acct1', timestamp: start.toISOString(), readingGallons: 1000 },
      { accountId: 'acct1', timestamp: end.toISOString(), readingGallons: 1500 },
      { accountId: 'acct2', timestamp: end.toISOString(), readingGallons: 500 }
    ];
  }
  const { utility, user, pass } = creds();
  const url = `${baseUrl}/api/Readings/GetAllReadings?StartDateTime=${start.toISOString()}&EndDateTime=${end.toISOString()}`;
  const resp = await fetch(url, {
    headers: {
      'Utility': utility,
      'UserName': user,
      'Password': pass
    }
  });
  if (!resp.ok) throw new Error(`Zenner readings failed: ${resp.status}`);
  return await resp.json();
}

export async function fetchZennerAccounts(opts: FetchOptions = {}): Promise<ZennerAccountRaw[]> {
  if (opts.mock) {
    return [
      { accountId: 'acct1', name: 'Alice Water', email: 'alice@example.com' },
      { accountId: 'acct2', name: 'Bob Flow', email: 'bob@example.com' }
    ];
  }
  const { utility, user, pass } = creds();
  const url = `${baseUrl}/api/Accounts/GetAllAccounts`;
  const resp = await fetch(url, {
    headers: {
      'Utility': utility,
      'UserName': user,
      'Password': pass
    }
  });
  if (!resp.ok) throw new Error(`Zenner accounts failed: ${resp.status}`);
  return await resp.json();
}
