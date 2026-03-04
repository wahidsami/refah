# Phase 1 scaling — Redis-backed rate limiter

## Summary

In-memory rate limiting was replaced with a **Redis-backed store** so limits apply across multiple API instances. Keys include route group, IP (via `ipKeyGenerator` for IPv6), optional `userId`, and optional `tenantId`.

---

## Files changed

| File | Change |
|------|--------|
| `server/src/middleware/rateLimiter.js` | Use Redis store via `rate-limit-redis`; one RedisStore per limiter (unique prefix `rl:{keyPrefix}:`); key generator: route group + `ipKeyGenerator(ip, 56)` + userId + tenantId; export `createRedisStore` instead of `redisStore`. |
| `server/tests/rateLimitRedis.test.js` | New test: two Express apps share the same Redis client and store; after exhausting limit on app1, app2 returns 429 for same IP (validates shared counter). Uses `ipKeyGenerator` in key generator. |
| `server/package.json` | Added dependency: `rate-limit-redis` (if not already present). |

**Usage (unchanged):**

- `server/src/index.js` — applies `generalLimiter` to `/api/v1/`, auth limiters to auth routes.
- `server/src/routes/paymentRoutes.js` — uses `paymentLimiter`.

---

## How to validate locally

1. **Start Redis** (required for Redis-backed limiting and the shared-counter test):
   ```bash
   # Windows (e.g. WSL or Docker)
   docker run -d -p 6379:6379 redis:alpine
   # Or use existing Redis at REDIS_URL (see .env).
   ```

2. **Run the shared-counter test:**
   ```bash
   cd server
   npm test -- tests/rateLimitRedis.test.js
   ```
   - Expect: **1 passed** (two instances share the same counter; second instance returns 429 after limit is hit on first).

3. **Optional — confirm server starts and limiters load:**
   ```bash
   cd server
   node -e "require('./src/middleware/rateLimiter'); console.log('rateLimiter loaded OK');"
   ```
   - Expect: `rateLimiter loaded OK` (and Redis connection log if Redis is running).

4. **Optional — end-to-end shared limit across two processes:**
   - Start API: `npm run dev` (or `node src/index.js`).
   - In another terminal, start a second process that only runs the same rate limiter middleware (e.g. minimal Express app using same Redis and same key generator).
   - Send enough requests from the same IP to hit the limit on process 1; then send one request to process 2 with the same IP — process 2 should return **429** (shared counter).

---

## Notes

- If Redis is unavailable, the middleware falls back to **in-memory** (no store passed), so the app still runs; limits are then per-instance.
- Each limiter uses its own RedisStore with a unique prefix to satisfy express-rate-limit’s “no store reuse” rule while sharing the same Redis connection.
