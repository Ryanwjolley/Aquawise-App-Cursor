import { describe, it, expect } from '@jest/globals';
import { syncZennerUsers } from '@/lib/zenner/syncUsers';

describe('Zenner user sync (mock)', () => {
  it('runs without throwing and returns updated list', async () => {
    const res = await syncZennerUsers('0', { mock: true });
    expect(Array.isArray(res)).toBe(true);
  });
});
