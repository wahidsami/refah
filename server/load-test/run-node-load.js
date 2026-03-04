/**
 * Node-based load test (no k6): availability + optional collision.
 * Run from server/: node load-test/run-node-load.js
 * Same env vars as k6: BASE_URL, TENANT_ID, SERVICE_ID, STAFF_ID, AUTH_TOKEN, TEST_DATE.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const TENANT_ID = process.env.TENANT_ID || '';
const SERVICE_ID = process.env.SERVICE_ID || '';
const STAFF_ID = process.env.STAFF_ID || '';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';
const TEST_DATE = process.env.TEST_DATE || (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
})();

const availabilityLatencies = [];
const availabilityErrors = [];
const createLatencies = [];
const createErrors = [];
const createConflicts = [];

function post(path, body, headers = {}) {
  const url = new URL(path, BASE_URL);
  const start = Date.now();
  return fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }).then((res) => {
    const ms = Date.now() - start;
    return res.json().catch(() => ({})).then((data) => ({ res, ms, data }));
  }).catch((err) => ({ res: null, ms: Date.now() - start, err: err.message }));
}

function searchAvailability() {
  return post('/api/v1/bookings/search', {
    tenantId: TENANT_ID,
    serviceId: SERVICE_ID,
    staffId: STAFF_ID || undefined,
    date: TEST_DATE,
  }).then(({ res, ms }) => {
    availabilityLatencies.push(ms);
    if (!res || res.status !== 200) availabilityErrors.push(1);
    return { res, ms };
  });
}

function createBooking(startTime) {
  return post('/api/v1/bookings/create', {
    tenantId: TENANT_ID,
    serviceId: SERVICE_ID,
    staffId: STAFF_ID || undefined,
    startTime,
  }, AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}).then(({ res, ms }) => {
    createLatencies.push(ms);
    if (res) {
      if (res.status === 201) createConflicts.push(0);
      else if (res.status === 409) createConflicts.push(1);
      else createErrors.push(1);
    } else {
      createErrors.push(1);
    }
    return { res, ms };
  });
}

function p95(arr) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const i = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, i)];
}

async function runAvailability(durationMs = 10000, concurrency = 5) {
  const end = Date.now() + durationMs;
  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push((async () => {
      while (Date.now() < end) {
        await searchAvailability();
        await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));
      }
    })());
  }
  await Promise.all(workers);
}

async function runCollision(sameSlot, numRequests = 30) {
  const promises = [];
  for (let i = 0; i < numRequests; i++) {
    promises.push(createBooking(sameSlot));
  }
  await Promise.all(promises);
}

async function main() {
  console.log('Node load test');
  console.log('BASE_URL:', BASE_URL);
  console.log('TENANT_ID:', TENANT_ID ? 'set' : 'MISSING');
  console.log('SERVICE_ID:', SERVICE_ID ? 'set' : 'MISSING');
  console.log('STAFF_ID:', STAFF_ID ? 'set' : 'MISSING');
  console.log('AUTH_TOKEN:', AUTH_TOKEN ? 'set' : 'MISSING');
  console.log('TEST_DATE:', TEST_DATE);
  console.log('');

  if (!TENANT_ID || !SERVICE_ID) {
    console.log('Set TENANT_ID and SERVICE_ID (e.g. $env:TENANT_ID = "uuid"). Exiting.');
    process.exit(1);
  }

  console.log('Phase 1: Availability (10s, 5 concurrent)...');
  await runAvailability(10000, 5);
  const avP95 = p95(availabilityLatencies);
  const avErrors = availabilityErrors.length;
  const avTotal = availabilityLatencies.length;
  console.log(`  Requests: ${avTotal}, errors: ${avErrors}, p95 latency: ${avP95 != null ? avP95.toFixed(0) : 'N/A'} ms`);
  console.log('');

  if (AUTH_TOKEN && STAFF_ID) {
    const sameSlot = new Date(TEST_DATE + 'T14:00:00.000Z').toISOString();
    console.log('Phase 2: Collision (30 concurrent creates, same slot)...');
    await runCollision(sameSlot, 30);
    const createTotal = createLatencies.length;
    const conflicts = createConflicts.filter(Boolean).length;
    const errs = createErrors.length;
    const createP95 = p95(createLatencies);
    const conflictRate = createTotal ? (conflicts / createTotal * 100).toFixed(1) : 'N/A';
    console.log(`  Requests: ${createTotal}, 201: ${createTotal - conflicts - errs}, 409: ${conflicts}, other errors: ${errs}`);
    console.log(`  p95 latency: ${createP95 != null ? createP95.toFixed(0) : 'N/A'} ms, conflict rate: ${conflictRate}%`);
  } else {
    console.log('Phase 2 skipped (set AUTH_TOKEN and STAFF_ID for create/collision).');
  }

  console.log('');
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
