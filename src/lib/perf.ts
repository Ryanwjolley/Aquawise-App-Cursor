// Tiny performance timing helper (low overhead) for ad-hoc profiling.
// Usage:
//   const end = startTimer('getUsageForUserFS');
//   ... do work ...
//   end(); // logs duration
// In production you could gate by env flag if noise becomes an issue.

export function startTimer(label: string) {
  const start = performance.now();
  let ended = false;
  return function end(extra?: Record<string, unknown>) {
    if (ended) return; // idempotent
    ended = true;
    const dur = performance.now() - start;
    // eslint-disable-next-line no-console
    console.debug(`[perf] ${label} ${dur.toFixed(1)}ms` + (extra ? ` ${JSON.stringify(extra)}` : ''));
  };
}
