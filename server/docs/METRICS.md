# Phase 1.5 observability — metrics

Minimal Prometheus-style metrics exposed at **GET /metrics** (text format). No external client library; in-memory counters and histogram.

---

## Metric names and labels

| Metric | Type | Labels | Description |
|--------|------|--------|--------------|
| `rifah_http_requests_total` | counter | `method`, `route`, `status` | Total HTTP requests. `route` is normalized (UUIDs → `:id`, numbers → `:id`) to limit cardinality. |
| `rifah_http_request_duration_ms` | histogram | `method`, `route`; `le` on buckets | Request latency in milliseconds. Buckets: 5, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, +Inf. |
| `rifah_booking_conflicts_total` | counter | — | Number of booking conflict detections (slot already taken or conflicting). |
| `rifah_redis_lock_failures_total` | counter | `reason` | Redis lock acquisition failures. `reason`: `contention` (lock held by another) or `error` (Redis error/thrown). |
| `rifah_db_pool_connections` | gauge | `state` | DB connection pool (when exposed by Sequelize). `state`: `total`, `available`, `pending`. May be absent if pool API differs. |

---

## Sample output

```text
# HELP rifah_http_requests_total Total HTTP requests by method, route, status
# TYPE rifah_http_requests_total counter
rifah_http_requests_total{method="GET",route="/health",status="200"} 42
rifah_http_requests_total{method="GET",route="/api/v1/tenant/appointments",status="200"} 10
rifah_http_requests_total{method="POST",route="/api/v1/bookings/create",status="201"} 3
rifah_http_requests_total{method="POST",route="/api/v1/bookings/create",status="409"} 1
# HELP rifah_http_request_duration_ms Request latency histogram (milliseconds)
# TYPE rifah_http_request_duration_ms histogram
rifah_http_request_duration_ms_bucket{method="GET",route="/health",le="5"} 40
rifah_http_request_duration_ms_bucket{method="GET",route="/health",le="25"} 42
rifah_http_request_duration_ms_bucket{method="GET",route="/health",le="50"} 42
rifah_http_request_duration_ms_bucket{method="GET",route="/health",le="100"} 42
rifah_http_request_duration_ms_bucket{method="GET",route="/health",le="250"} 42
rifah_http_request_duration_ms_bucket{method="GET",route="/health",le="500"} 42
rifah_http_request_duration_ms_bucket{method="GET",route="/health",le="1000"} 42
rifah_http_request_duration_ms_bucket{method="GET",route="/health",le="2500"} 42
rifah_http_request_duration_ms_bucket{method="GET",route="/health",le="5000"} 42
rifah_http_request_duration_ms_bucket{method="GET",route="/health",le="10000"} 42
rifah_http_request_duration_ms_bucket{method="GET",route="/health",le="+Inf"} 42
rifah_http_request_duration_ms_count{method="GET",route="/health"} 42
rifah_http_request_duration_ms_sum{method="GET",route="/health"} 312
# HELP rifah_booking_conflicts_total Booking conflict detections
# TYPE rifah_booking_conflicts_total counter
rifah_booking_conflicts_total 2
# HELP rifah_redis_lock_failures_total Redis lock acquisition failures
# TYPE rifah_redis_lock_failures_total counter
rifah_redis_lock_failures_total{reason="contention"} 1
rifah_redis_lock_failures_total{reason="error"} 0
# HELP rifah_db_pool_connections Database connection pool gauges
# TYPE rifah_db_pool_connections gauge
rifah_db_pool_connections{state="total"} 10
rifah_db_pool_connections{state="available"} 8
rifah_db_pool_connections{state="pending"} 0
```

---

## Scraping and collection

- **Endpoint:** `GET /metrics` (same host/port as the API; no auth in this implementation — put behind firewall or auth in production if needed).
- **Content-Type:** `text/plain; charset=utf-8`.
- **Prometheus** — add to `scrape_configs`:

```yaml
scrape_configs:
  - job_name: 'rifah-api'
    scrape_interval: 15s
    scrape_timeout: 10s
    static_configs:
      - targets: ['localhost:5000']   # or your API host:port
    metrics_path: /metrics
```

- **Security:** Restrict access to `/metrics` (e.g. firewall, VPN, or reverse proxy with allowlist). Do not expose publicly if the deployment is internet-facing.

---

## Suggested alerts

Use with Prometheus + Alertmanager (or equivalent). Adjust thresholds to your SLOs.

| Alert | Condition (PromQL-style) | Severity | Action |
|-------|---------------------------|----------|--------|
| High 5xx rate | `rate(rifah_http_requests_total{status=~"5.."}[5m]) / rate(rifah_http_requests_total[5m]) > 0.05` | critical | Page on-call; check logs and dependencies. |
| High latency (p99) | `histogram_quantile(0.99, rate(rifah_http_request_duration_ms_bucket[5m])) > 3000` | warning | Investigate slow queries or overload. |
| Booking conflicts spike | `increase(rifah_booking_conflicts_total[15m]) > 20` | warning | Possible double-booking attempts or race; check conflict logic and Redis locks. |
| Redis lock failures (errors) | `increase(rifah_redis_lock_failures_total{reason="error"}[5m]) > 0` | critical | Redis may be down or failing; check Redis and app logs. |
| Redis lock contention high | `rate(rifah_redis_lock_failures_total{reason="contention"}[5m]) > 1` | warning | Many concurrent bookings for same slot; may be expected under load. |
| DB pool exhausted | `rifah_db_pool_connections{state="available"} == 0` or `rifah_db_pool_connections{state="pending"} > 5` | critical | Increase pool size or fix connection leaks; check DB and app. |

---

## Running locally

1. Start the API (e.g. `cd server && npm run dev`).
2. Send some traffic (browse or `curl` a few endpoints).
3. Open or curl:

   ```bash
   curl -s http://localhost:5000/metrics
   ```

You should see the metrics in Prometheus text format. DB pool lines appear only if Sequelize exposes `connectionManager.pool` with `size`/`available` (and optionally `pending`).
