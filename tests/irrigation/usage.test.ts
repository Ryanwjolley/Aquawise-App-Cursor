import { describe, it, expect } from '@jest/globals';
import { syncIrrigationUsage } from '@/lib/irrigation/syncUsage';

// Light test (mock mode) similar to zenner delta test.

describe('Irrigation usage sync (mock)', () => {
  it('returns array of results without throwing', async () => {
    const results = await syncIrrigationUsage('pilotCo1', { mock: true });
    expect(Array.isArray(results)).toBe(true);
    if (results.length) {
      expect(results[0]).toHaveProperty('assetId');
      expect(results[0]).toHaveProperty('newUsageGallons');
    }
  });
});
