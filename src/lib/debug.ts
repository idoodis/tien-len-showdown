export const isDev = process.env.NODE_ENV !== 'production';

export function debugLog(scope: string, ...args: unknown[]) {
  if (!isDev || typeof console === 'undefined') return;
  console.info(`[${scope}]`, ...args);
}
