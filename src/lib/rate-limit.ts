/**
 * Best-effort in-memory limiter. Per-instance only: swap for Upstash/KV once
 * deployed to a multi-instance host.
 */
export function createRateLimiter(maxRequests: number, windowMs = 60_000) {
  const hits = new Map<string, number[]>();

  return function isLimited(ip: string) {
    const now = Date.now();
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 5000) {
      for (const [key, times] of hits) {
        if (times.every((t) => now - t >= windowMs)) hits.delete(key);
      }
    }
    return recent.length > maxRequests;
  };
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
}
