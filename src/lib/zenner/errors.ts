import { sendIntegrationAlert } from './notify';

export async function withRetry<T>(fn: () => Promise<T>, context: string, max = 3, delayMs = 500): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (e: any) {
      attempt++;
      if (attempt >= max) {
        await sendIntegrationAlert(`Zenner: ${context} failed after ${attempt} attempts: ${e?.message || e}`);
        throw e;
      }
      await new Promise(r => setTimeout(r, delayMs * Math.pow(2, attempt - 1)));
    }
  }
}
