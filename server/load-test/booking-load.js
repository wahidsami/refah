/**
 * k6 load test: availability search, booking create, and parallel collision.
 *
 * Requires k6: https://k6.io/docs/get-started/installation/
 *
 * Env vars (point to staging or local):
 *   BASE_URL          - API base (default http://localhost:5000)
 *   TENANT_ID         - UUID of tenant
 *   SERVICE_ID        - UUID of service
 *   STAFF_ID          - UUID of staff (for create and collision)
 *   AUTH_TOKEN        - JWT Bearer token for POST /bookings/create (optional; if missing, create phases are skipped)
 *   TEST_DATE         - YYYY-MM-DD for availability (default: tomorrow)
 *
 * Run:
 *   k6 run server/load-test/booking-load.js
 *   BASE_URL=https://staging-api.example.com TENANT_ID=... SERVICE_ID=... STAFF_ID=... AUTH_TOKEN=... k6 run server/load-test/booking-load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const TENANT_ID = __ENV.TENANT_ID || '';
const SERVICE_ID = __ENV.SERVICE_ID || '';
const STAFF_ID = __ENV.STAFF_ID || '';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const TEST_DATE = __ENV.TEST_DATE || (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
})();

const latencyAvailability = new Trend('latency_availability_ms', true);
const latencyBookingCreate = new Trend('latency_booking_create_ms', true);
const errorRateAvailability = new Rate('errors_availability');
const errorRateBookingCreate = new Rate('errors_booking_create');
const conflictRate = new Rate('booking_conflict');

function searchAvailability() {
  const url = `${BASE_URL}/api/v1/bookings/search`;
  const payload = JSON.stringify({
    tenantId: TENANT_ID,
    serviceId: SERVICE_ID,
    staffId: STAFF_ID || undefined,
    date: TEST_DATE,
  });
  const res = http.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  const ok = check(res, { 'availability status 200': (r) => r.status === 200 });
  errorRateAvailability.add(!ok);
  latencyAvailability.add(res.timings.duration);
  return res;
}

function createBooking(startTime, expectConflict = false) {
  const url = `${BASE_URL}/api/v1/bookings/create`;
  const payload = JSON.stringify({
    tenantId: TENANT_ID,
    serviceId: SERVICE_ID,
    staffId: STAFF_ID || undefined,
    startTime,
  });
  const headers = {
    'Content-Type': 'application/json',
    Authorization: AUTH_TOKEN ? `Bearer ${AUTH_TOKEN}` : '',
  };
  const res = http.post(url, payload, { headers });
  const isConflict = res.status === 409 || (res.body && (res.body.includes('conflict') || res.body.includes('already taken') || res.body.includes('SLOT_BUSY')));
  const isSuccess = res.status === 201;
  const isClientError = res.status >= 400 && res.status < 500;
  errorRateBookingCreate.add(!isSuccess && !isConflict);
  if (isConflict) conflictRate.add(1);
  else conflictRate.add(0);
  latencyBookingCreate.add(res.timings.duration);
  return res;
}

export const options = {
  scenarios: {
    availability: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      startTime: '0s',
      exec: 'availabilityScenario',
    },
    booking_create: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      startTime: '35s',
      exec: 'bookingCreateScenario',
    },
    collision: {
      executor: 'per-vu-iterations',
      vus: 20,
      iterations: 20,
      maxDuration: '60s',
      startTime: '70s',
      exec: 'collisionScenario',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.1'],
    latency_availability_ms: ['p(95)<2000'],
    latency_booking_create_ms: ['p(95)<5000'],
  },
};

export function availabilityScenario() {
  searchAvailability();
  sleep(0.5 + Math.random() * 1);
}

export function bookingCreateScenario() {
  if (!AUTH_TOKEN || !TENANT_ID || !SERVICE_ID) return;
  const d = new Date(TEST_DATE + 'T10:00:00.000Z');
  d.setMinutes(d.getMinutes() + Math.floor(Math.random() * 8) * 15);
  const startTime = d.toISOString();
  createBooking(startTime, false);
  sleep(1 + Math.random() * 2);
}

export function collisionScenario() {
  if (!AUTH_TOKEN || !TENANT_ID || !SERVICE_ID || !STAFF_ID) return;
  const sameSlot = new Date(TEST_DATE + 'T14:00:00.000Z').toISOString();
  createBooking(sameSlot, true);
}

export function setup() {
  if (!TENANT_ID || !SERVICE_ID) {
    console.warn('TENANT_ID and SERVICE_ID are required for availability. Set BASE_URL, TENANT_ID, SERVICE_ID (and STAFF_ID, AUTH_TOKEN for create).');
  }
  return {};
}

export function handleSummary(data) {
  const availability = data.metrics.latency_availability_ms;
  const create = data.metrics.latency_booking_create_ms;
  const errAv = data.metrics.errors_availability;
  const errCreate = data.metrics.errors_booking_create;
  const conflict = data.metrics.booking_conflict;

  const p95Av = availability && availability.values && availability.values['p(95)'] != null ? availability.values['p(95)'].toFixed(0) : 'N/A';
  const p95Create = create && create.values && create.values['p(95)'] != null ? create.values['p(95)'].toFixed(0) : 'N/A';
  const errAvPct = errAv && errAv.values && errAv.values.rate != null ? (errAv.values.rate * 100).toFixed(2) : 'N/A';
  const errCreatePct = errCreate && errCreate.values && errCreate.values.rate != null ? (errCreate.values.rate * 100).toFixed(2) : 'N/A';
  const conflictPct = conflict && conflict.values && conflict.values.rate != null ? (conflict.values.rate * 100).toFixed(2) : 'N/A';

  const summaryTxt = `
Load test summary
================
Base URL: ${BASE_URL}
Tenant: ${TENANT_ID ? 'set' : 'MISSING'}
Service: ${SERVICE_ID ? 'set' : 'MISSING'}
Staff: ${STAFF_ID ? 'set' : 'MISSING'}
Auth: ${AUTH_TOKEN ? 'set' : 'MISSING (create phases skipped)'}

Availability
  p95 latency (ms): ${p95Av}
  error rate:       ${errAvPct !== 'N/A' ? errAvPct + '%' : errAvPct}

Booking create
  p95 latency (ms): ${p95Create}
  error rate:       ${errCreatePct !== 'N/A' ? errCreatePct + '%' : errCreatePct}
  conflict rate:    ${conflictPct !== 'N/A' ? conflictPct + '%' : conflictPct}
`;

  const stdoutLines = [
    `availability p95 (ms): ${p95Av}`,
    `booking create p95 (ms): ${p95Create}`,
    `availability error rate: ${errAvPct}%`,
    `booking create error rate: ${errCreatePct}%`,
    `booking conflict rate: ${conflictPct}%`,
  ];
  return {
    stdout: stdoutLines.join('\n') + '\n',
    'server/load-test/summary.json': JSON.stringify(data, null, 2),
    'server/load-test/summary.txt': summaryTxt,
  };
}
