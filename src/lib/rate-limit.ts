type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

/**
 * Lightweight process-local limiter for server actions.
 * It provides a safe MVP fallback without coupling the app to one hosting vendor.
 * Production deployments can replace this module with a shared Redis/WAF-backed
 * implementation without changing callers.
 */
export function assertRateLimit(
  scope: string,
  key: string,
  options: { limit: number; windowMs: number },
) {
  const now = Date.now();
  const bucketKey = `${scope}:${key.trim().toLowerCase()}`;
  const current = buckets.get(bucketKey);

  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return;
  }

  if (current.count >= options.limit) {
    throw new Error('RATE_LIMITED');
  }

  current.count += 1;
}
