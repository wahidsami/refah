# Load test (k6) — availability, booking create, collision

Uses [k6](https://k6.io/) to simulate browsing availability, creating bookings, and parallel collisions on the same staff/slot.

---

## Prerequisites

### Option A: k6 (recommended for full scenarios)

Install **k6** so the `k6` command is available:

- **Windows (winget):**  
  `winget install k6 --source winget`  
  Then close and reopen PowerShell (or restart the terminal) so `k6` is on PATH.

- **Windows (Chocolatey):**  
  `choco install k6`

- **Windows (manual):**  
  Download the Windows binary from [k6 releases](https://github.com/grafana/k6/releases) (e.g. `k6-v0.52.0-windows-amd64.zip`), extract, and add the folder to your PATH, or run with full path:  
  `& "C:\path\to\k6.exe" run server/load-test/booking-load.js`

- **macOS/Linux:**  
  See [Install k6](https://k6.io/docs/get-started/installation/) (e.g. `brew install k6` or package manager).

After installing, run `k6 version` in a new terminal to confirm.

### Option B: Node-only (no k6)

If you don't want to install k6, you can run the Node-based load test (availability + optional collision). From project root:

```powershell
cd server
npm install
npm run load-test
```

Set the same env vars (e.g. `$env:BASE_URL = "http://localhost:5000"`, `$env:TENANT_ID = "..."`, etc.) before running. See [Node load test (no k6)](#node-load-test-no-k6) below.

---

## Node load test (no k6)

If **k6 is not installed** (e.g. `k6` not recognized in PowerShell), you can run the Node-based load test from the **server** directory:

1. **From project root**, go to server and run:
   ```powershell
   cd server
   $env:BASE_URL = "http://localhost:5000"
   $env:TENANT_ID = "your-tenant-uuid"
   $env:SERVICE_ID = "your-service-uuid"
   npm run load-test
   ```

2. **With create/collision** (optional): also set `STAFF_ID` and `AUTH_TOKEN`, then run `npm run load-test` again.

The script runs **Phase 1** (availability for ~10s, 5 concurrent) and, if `AUTH_TOKEN` and `STAFF_ID` are set, **Phase 2** (30 concurrent creates for the same slot). It prints request counts, p95 latency, error count, and conflict rate. No k6 binary required.

---

## Environment variables (staging / local)

| Variable | Required | Description |
|----------|----------|-------------|
| `BASE_URL` | No | API base URL (default: `http://localhost:5000`). Set to staging e.g. `https://staging-api.example.com`. |
| `TENANT_ID` | Yes* | Tenant UUID. Required for availability; required for create/collision. |
| `SERVICE_ID` | Yes* | Service UUID. Required for availability and create. |
| `STAFF_ID` | No* | Staff UUID. Optional for availability (any staff); **required for collision** so all VUs hit the same slot. |
| `AUTH_TOKEN` | No* | JWT Bearer token for `POST /api/v1/bookings/create`. If missing, **availability** still runs; **booking create** and **collision** phases do nothing. |
| `TEST_DATE` | No | Date for slots in `YYYY-MM-DD` (default: tomorrow). |

\* For **availability-only** runs you need at least `TENANT_ID` and `SERVICE_ID`. For **create** and **collision** you need `AUTH_TOKEN`, `TENANT_ID`, `SERVICE_ID`, and for collision ideally `STAFF_ID`.

**Get real IDs from your DB:** From the `server` directory run:
```powershell
cd server
node scripts/get-load-test-ids.js
```
This prints a tenant, service, and staff ID from your database and copy-paste PowerShell (and k6) commands. Use the same `.env` as the API so the script can connect to the DB.

---

## Run commands

From the **project root** (so paths and `server/load-test` are correct).

### Bash / WSL / Git Bash

**Local (availability only; no create if no token):**
```bash
TENANT_ID=<uuid> SERVICE_ID=<uuid> k6 run server/load-test/booking-load.js
```

**Local with create + collision (need valid JWT and IDs):**
```bash
BASE_URL=http://localhost:5000 \
TENANT_ID=<tenant-uuid> \
SERVICE_ID=<service-uuid> \
STAFF_ID=<staff-uuid> \
AUTH_TOKEN=<jwt> \
k6 run server/load-test/booking-load.js
```

**Staging:**
```bash
BASE_URL=https://staging-api.example.com \
TENANT_ID=<staging-tenant-uuid> \
SERVICE_ID=<staging-service-uuid> \
STAFF_ID=<staging-staff-uuid> \
AUTH_TOKEN=<staging-user-jwt> \
k6 run server/load-test/booking-load.js
```

### Windows (PowerShell)

PowerShell does not support `VAR=value command`. Set env vars first, then run k6:

**Local (availability only):**
```powershell
$env:TENANT_ID = "your-tenant-uuid"; $env:SERVICE_ID = "your-service-uuid"; k6 run server/load-test/booking-load.js
```

**Local with create + collision:**
```powershell
$env:BASE_URL = "http://localhost:5000"
$env:TENANT_ID = "your-tenant-uuid"
$env:SERVICE_ID = "your-service-uuid"
$env:STAFF_ID = "your-staff-uuid"
$env:AUTH_TOKEN = "your-jwt-token"
k6 run server/load-test/booking-load.js
```

**Staging:**
```powershell
$env:BASE_URL = "https://staging-api.example.com"
$env:TENANT_ID = "your-staging-tenant-uuid"
$env:SERVICE_ID = "your-staging-service-uuid"
$env:STAFF_ID = "your-staging-staff-uuid"
$env:AUTH_TOKEN = "your-staging-jwt"
k6 run server/load-test/booking-load.js
```

**Optional: custom date (PowerShell):**
```powershell
$env:TEST_DATE = "2025-03-01"; $env:TENANT_ID = "..."; $env:SERVICE_ID = "..."; k6 run server/load-test/booking-load.js
```

After the run, k6 prints a summary to stdout and writes:
- `server/load-test/summary.json` — full k6 metrics/output
- `server/load-test/summary.txt` — short human-readable summary (p95, error rate, conflict rate)

---

## Phases (scenarios)

1. **Availability** (0–30 s)  
   - 10 VUs, constant.  
   - Each iteration: `POST /api/v1/bookings/search` with `tenantId`, `serviceId`, `staffId` (if set), `date`.  
   - Reports: **p95 latency** for availability, **error rate** for availability.

2. **Booking create** (35–65 s)  
   - 5 VUs, constant.  
   - Each iteration: `POST /api/v1/bookings/create` with a **random** slot on `TEST_DATE` (spread over ~2 hours).  
   - Requires `AUTH_TOKEN`.  
   - Reports: **p95 latency** for create, **error rate** for create, **conflict rate** (proportion of 409 responses).

3. **Collision** (70 s onward)  
   - 20 VUs × 20 iterations each.  
   - All requests target the **same** `staffId` and **same** `startTime` (fixed slot on `TEST_DATE`).  
   - Expect: **one 201** (success) and **many 409** (conflict).  
   - Reports: **conflict rate** for this phase (should be high, e.g. >90%), plus create p95/error rate.

---

## Reported metrics

- **p95 latency (availability)** — 95th percentile response time for `POST /api/v1/bookings/search` (ms).
- **p95 latency (booking create)** — 95th percentile response time for `POST /api/v1/bookings/create` (ms).
- **Error rate (availability)** — proportion of availability requests that did not return HTTP 200.
- **Error rate (booking create)** — proportion of create requests that failed with non-409 (e.g. 4xx/5xx). 409 is counted as success for “error rate” but as **conflict**.
- **Booking conflict rate** — proportion of create requests that returned **409** (or body indicating conflict/slot taken). High in the **collision** phase is expected.

---

## Interpretation notes

- **Availability p95**  
  - Typical target: &lt; 1500–2000 ms.  
  - High values: DB or availability logic slow; check indexes and N+1 queries.

- **Booking create p95**  
  - Typical target: &lt; 3000–5000 ms (create does DB + Redis lock).  
  - High values: DB write, Redis, or lock contention.

- **Error rate**  
  - Keep low (e.g. &lt; 1–5%).  
  - High availability errors: wrong `TENANT_ID`/`SERVICE_ID`, or staging down.  
  - High create errors (non-409): auth (invalid/expired token), validation, or server errors.

- **Conflict rate**  
  - **Normal load (booking_create phase):** expect low (e.g. 0–10%) if slots are spread.  
  - **Collision phase:** expect **high** (e.g. 90%+). One request wins (201), rest get 409. If collision phase conflict rate is low, either concurrency is low or the lock/conflict path may not be exercised.

- **Staging**  
  - Use the same env vars as production-like config (real tenant/service/staff and a real user JWT).  
  - Run during a quiet window if you don’t want real bookings; or use a dedicated test tenant and clean up data after.

---

## File layout

```
server/load-test/
  booking-load.js   # k6 script (scenarios, metrics, handleSummary)
  README.md         # This file
  summary.json      # Written after run (full k6 output)
  summary.txt       # Written after run (short summary)
```
