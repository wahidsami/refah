/**
 * Minimal Prometheus-style metrics (in-memory).
 * Production-safe: no external deps, bounded cardinality, text format only.
 */

const BUCKETS_MS = [5, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

/** Normalize path to limit cardinality: replace UUIDs with :id, trim length */
function normalizeRoute(path) {
    if (!path || typeof path !== 'string') return 'unknown';
    const withoutQuery = path.split('?')[0];
    const normalized = withoutQuery
        .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
        .replace(/\/[0-9a-f]{24}/gi, '/:id')
        .replace(/\/\d+/g, '/:id');
    return normalized.slice(0, 200) || '/';
}

const state = {
    /** @type {Map<string, number>} key: "method|route|status" */
    requests: new Map(),
    /** @type {Map<string, number[]>} key: "method|route", value: bucket counts (length = BUCKETS_MS.length + 1) */
    latency: new Map(),
    /** @type {Map<string, number>} key: "method|route", value: sum of observed latencies (ms) */
    latencySum: new Map(),
    /** @type {number} */
    bookingConflicts: 0,
    /** @type {Map<string, number>} key: reason (contention | error) */
    redisLockFailures: new Map(),
    /** @type {{ size?: number, available?: number, pending?: number } | null} */
    dbPool: null
};

function requestKey(method, route, status) {
    return `${method}|${route}|${status}`;
}

function latencyKey(method, route) {
    return `${method}|${route}`;
}

function getOrCreateLatencyBuckets(method, route) {
    const key = latencyKey(method, route);
    if (!state.latency.has(key)) {
        state.latency.set(key, new Array(BUCKETS_MS.length + 1).fill(0));
    }
    return state.latency.get(key);
}

/** Record HTTP request (call on response finish) */
function recordRequest(method, route, statusCode, latencyMs) {
    const routeNorm = normalizeRoute(route);
    const status = String(statusCode);
    const key = requestKey(method, routeNorm, status);
    state.requests.set(key, (state.requests.get(key) || 0) + 1);

    const buckets = getOrCreateLatencyBuckets(method, routeNorm);
    let placed = false;
    for (let i = 0; i < BUCKETS_MS.length; i++) {
        if (latencyMs <= BUCKETS_MS[i]) {
            buckets[i]++;
            placed = true;
            break;
        }
    }
    if (!placed) buckets[BUCKETS_MS.length]++;
    const lkey = latencyKey(method, routeNorm);
    state.latencySum.set(lkey, (state.latencySum.get(lkey) || 0) + latencyMs);
}

/** Increment booking conflict counter */
function recordBookingConflict() {
    state.bookingConflicts++;
}

/** Increment Redis lock failure (reason: 'contention' | 'error') */
function recordRedisLockFailure(reason) {
    const r = reason === 'contention' || reason === 'error' ? reason : 'error';
    state.redisLockFailures.set(r, (state.redisLockFailures.get(r) || 0) + 1);
}

/** Set DB pool snapshot (call periodically or on scrape if sequelize exposes it) */
function setDbPoolSnapshot(snapshot) {
    state.dbPool = snapshot && typeof snapshot === 'object' ? snapshot : null;
}

/** Render Prometheus text format */
function render() {
    const lines = [];

    lines.push('# HELP rifah_http_requests_total Total HTTP requests by method, route, status');
    lines.push('# TYPE rifah_http_requests_total counter');
    for (const [key, value] of state.requests) {
        const [method, route, status] = key.split('|');
        const routeEsc = route.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        lines.push(`rifah_http_requests_total{method="${method}",route="${routeEsc}",status="${status}"} ${value}`);
    }

    lines.push('# HELP rifah_http_request_duration_ms Request latency histogram (milliseconds)');
    lines.push('# TYPE rifah_http_request_duration_ms histogram');
    for (const [key, buckets] of state.latency) {
        const [method, route] = key.split('|');
        const routeEsc = route.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        let cum = 0;
        for (let i = 0; i < BUCKETS_MS.length; i++) {
            cum += buckets[i];
            lines.push(`rifah_http_request_duration_ms_bucket{method="${method}",route="${routeEsc}",le="${BUCKETS_MS[i]}"} ${cum}`);
        }
        cum += buckets[BUCKETS_MS.length];
        lines.push(`rifah_http_request_duration_ms_bucket{method="${method}",route="${routeEsc}",le="+Inf"} ${cum}`);
        lines.push(`rifah_http_request_duration_ms_count{method="${method}",route="${routeEsc}"} ${cum}`);
        const sum = state.latencySum.get(key) || 0;
        lines.push(`rifah_http_request_duration_ms_sum{method="${method}",route="${routeEsc}"} ${sum}`);
    }

    lines.push('# HELP rifah_booking_conflicts_total Booking conflict detections');
    lines.push('# TYPE rifah_booking_conflicts_total counter');
    lines.push(`rifah_booking_conflicts_total ${state.bookingConflicts}`);

    lines.push('# HELP rifah_redis_lock_failures_total Redis lock acquisition failures');
    lines.push('# TYPE rifah_redis_lock_failures_total counter');
    for (const reason of ['contention', 'error']) {
        const val = state.redisLockFailures.get(reason) || 0;
        lines.push(`rifah_redis_lock_failures_total{reason="${reason}"} ${val}`);
    }

    if (state.dbPool && (state.dbPool.size != null || state.dbPool.available != null)) {
        lines.push('# HELP rifah_db_pool_connections Database connection pool gauges');
        lines.push('# TYPE rifah_db_pool_connections gauge');
        if (state.dbPool.size != null) lines.push(`rifah_db_pool_connections{state="total"} ${state.dbPool.size}`);
        if (state.dbPool.available != null) lines.push(`rifah_db_pool_connections{state="available"} ${state.dbPool.available}`);
        if (state.dbPool.pending != null) lines.push(`rifah_db_pool_connections{state="pending"} ${state.dbPool.pending}`);
    }

    return lines.join('\n') + '\n';
}

module.exports = {
    recordRequest,
    recordBookingConflict,
    recordRedisLockFailure,
    setDbPoolSnapshot,
    render,
    normalizeRoute,
    BUCKETS_MS
};
