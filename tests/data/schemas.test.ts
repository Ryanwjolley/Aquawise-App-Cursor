import { describe, it, expect } from '@jest/globals';
import { parseUsageEntry, parseAllocation, parseWaterOrder, parseNotification } from '@/lib/schemas';

describe('schemas parsing', () => {
  it('parses valid usage entry', () => {
    const u = parseUsageEntry('u1_2024-01-01', { userId: 'u1', date: '2024-01-01', usage: 10 });
    expect(u).not.toBeNull();
    expect(u?.usage).toBe(10);
  });
  it('rejects invalid usage date', () => {
    const u = parseUsageEntry('bad', { userId: 'u1', date: '01-01-2024', usage: 5 });
    expect(u).toBeNull();
  });
  it('rejects negative usage', () => {
    const u = parseUsageEntry('neg', { userId: 'u1', date: '2024-01-02', usage: -1 });
    expect(u).toBeNull();
  });
  it('rejects allocation with start> end', () => {
    const a = parseAllocation('a1', { startDate: '2024-02-02', endDate: '2024-02-01', gallons: 100, companyId: 'c1' });
    expect(a).toBeNull();
  });
  it('parses valid allocation', () => {
    const a = parseAllocation('a2', { startDate: '2024-02-01', endDate: '2024-02-02', gallons: 100, companyId: 'c1' });
    expect(a).not.toBeNull();
  });
  it('rejects invalid water order temporal', () => {
    const o = parseWaterOrder('o1', { userId: 'u1', companyId: 'c1', startDate: '2024-03-02', endDate: '2024-03-01', amount: 10, unit: 'gallons', totalGallons: 10, status: 'pending', createdAt: '2024-02-01' });
    expect(o).toBeNull();
  });
  it('parses valid water order', () => {
    const o = parseWaterOrder('o2', { userId: 'u1', companyId: 'c1', startDate: '2024-03-01', endDate: '2024-03-02', amount: 10, unit: 'gallons', totalGallons: 10, status: 'pending', createdAt: '2024-02-01' });
    expect(o).not.toBeNull();
  });
  it('parses valid notification', () => {
    const n = parseNotification('n1', { userId: 'u1', message: 'Hi', createdAt: '2024-01-01T00:00:00Z', isRead: false });
    expect(n).not.toBeNull();
  });
  it('rejects notification missing message', () => {
    const n = parseNotification('n2', { userId: 'u1', createdAt: '2024-01-01T00:00:00Z', isRead: false });
    expect(n).toBeNull();
  });
});