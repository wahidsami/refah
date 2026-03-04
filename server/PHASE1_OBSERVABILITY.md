# Phase 1 observability foundation

## Summary

- **Request ID:** Middleware assigns `requestId` from incoming `X-Request-Id` header if present, otherwise generates a UUID; sets `req.requestId` and response header `X-Request-Id`.
- **Structured request logs:** JSON logs for request start and request end (latency, status code, requestId, tenantId, userId, route).
- **Error logs:** Stack traces included only in non-production (global error handler and production logger).

---

## Where logs are emitted

| Location | What is logged |
|----------|----------------|
| `server/src/middleware/requestLogger.js` | **Request start:** one JSON line per request when it enters. **Request end:** one JSON line when response finishes (with latency, statusCode, requestId, route, and tenantId/userId when set by auth). |
| `server/src/middleware/errorHandler.js` | **Errors:** one JSON line per unhandled error (requestId, tenantId, message, statusCode; **stack only when `NODE_ENV !== 'production'`**). |
| `server/src/utils/productionLogger.js` | **`logger.error(message, error, context)`:** stack is included only when `NODE_ENV !== 'production'` (development). |

All of the above use **stdout** (request/end) or **stderr** (errorHandler) as single-line JSON for easy aggregation.

---

## Sample log lines

**Request start:**
```json
{"event":"request_start","requestId":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","method":"GET","route":"/api/v1/tenants"}
```

**Request end (unauthenticated):**
```json
{"event":"request_end","requestId":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","method":"GET","route":"/api/v1/tenants","statusCode":200,"latencyMs":45}
```

**Request end (authenticated; tenantId/userId set by auth middleware):**
```json
{"event":"request_end","requestId":"b2c3d4e5-f6a7-8901-bcde-f12345678901","method":"GET","route":"/api/v1/tenant/dashboard","statusCode":200,"latencyMs":120,"tenantId":"tenant-uuid","userId":"user-uuid"}
```

**Error (non-production; includes stack):**
```json
{"requestId":"c3d4e5f6-a7b8-9012-cdef-123456789012","tenantId":null,"message":"Not found","statusCode":404,"stack":"Error: Not found\n    at ..."}
```

**Error (production; no stack):**
```json
{"requestId":"c3d4e5f6-a7b8-9012-cdef-123456789012","tenantId":null,"message":"Not found","statusCode":404}
```

---

## How to test

1. **Request ID (incoming header vs generated)**  
   - With header:  
     `curl -H "X-Request-Id: my-test-id-123" http://localhost:5000/api/v1/tenants`  
     Response should include `X-Request-Id: my-test-id-123` and logs should show `"requestId":"my-test-id-123"`.  
   - Without header:  
     `curl http://localhost:5000/api/v1/tenants`  
     Response should include `X-Request-Id` with a new UUID and logs should show that same UUID.

2. **Structured request logs**  
   - Start server: `cd server && npm run dev` (or `node src/index.js`).  
   - Send a request: `curl http://localhost:5000/api/v1/tenants`.  
   - On stdout you should see two JSON lines per request:  
     - `"event":"request_start"` with `requestId`, `method`, `route`.  
     - `"event":"request_end"` with `requestId`, `method`, `route`, `statusCode`, `latencyMs`, and optionally `tenantId`/`userId` for protected routes.

3. **tenantId / userId on protected routes**  
   - Call a tenant-protected route with a valid JWT (e.g. tenant dashboard).  
   - The `request_end` log line for that request should include `tenantId` and `userId` when set by auth.

4. **Error logs and stack only in non-prod**  
   - Trigger a 404: `curl http://localhost:5000/api/v1/nonexistent`.  
   - With `NODE_ENV=development` (or unset): stderr should show an error log line that includes a `"stack"` field.  
   - With `NODE_ENV=production`: run again and confirm the error log line has **no** `"stack"` field.

5. **Production logger (stack only in non-prod)**  
   - Any code path that calls `logger.error(message, err, context)` will include `err.stack` only when not in production (see `server/src/utils/productionLogger.js`).

---

## Files changed

| File | Change |
|------|--------|
| `server/src/middleware/requestId.js` | Use incoming `X-Request-Id` if present, else generate full `crypto.randomUUID()`. |
| `server/src/middleware/requestLogger.js` | **New.** Structured JSON logs: request_start on entry, request_end on `res.on('finish')` with latency, statusCode, requestId, route, tenantId, userId. |
| `server/src/middleware/errorHandler.js` | No code change; already restricts stack to non-production. |
| `server/src/utils/productionLogger.js` | `error()`: include `stack` only when `this.isDevelopment` (non-production). |
| `server/src/index.js` | Require and use `requestLogger` after `requestId`. |
