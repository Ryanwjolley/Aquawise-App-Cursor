import { describe, it, expect } from '@jest/globals';
import { syncZennerUsage } from '@/lib/zenner/syncUsage';

// NOTE: This is a very light test since Firestore is live; in a full setup we'd mock Firestore.
describe('Zenner usage sync (mock)', () => {
  it('runs without throwing and returns result array', async () => {
    // Provide a fake company id; expected to write mock docs if Firestore connected
    const res = await syncZennerUsage('0', { mock: true });
    expect(Array.isArray(res)).toBe(true);
  });
});
