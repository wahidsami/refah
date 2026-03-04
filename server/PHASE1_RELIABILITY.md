# Phase 1 reliability

## Migration policy (production = migrations only)

- **Production must not use `sequelize.sync()`.** Schema changes in production are done only via **migrations** (Sequelize CLI).
- **Behavior:**
  - When `NODE_ENV=production`, the server **skips** all model `sync()` calls at startup. It only connects and assumes the schema is already applied by migrations.
  - When `NODE_ENV` is not `production` (e.g. development, test), the server may run `sync({ force: false })` for convenience.
- **Seed script:** `node seed.js` (or `npm run seed` from root) is **disabled in production** and throws if `NODE_ENV=production`. Use migrations for schema; add seed data manually if needed.
- **Where this is enforced:**
  - `server/src/index.js`: sync block is wrapped in `if (process.env.NODE_ENV !== 'production')`.
  - `server/seed.js`: throws at start when `NODE_ENV === 'production'`.

---

## Staging / production deploy checklist

Use this **before** and **during** each deploy to staging or production.

### Pre-deploy (on your machine or CI)

- [ ] All tests pass: `cd server && npm test`
- [ ] Lint passes: `cd server && npm run lint`
- [ ] Migration files valid: `cd server && npm run migration:validate`
- [ ] Migrations run against a staging DB (or a copy of prod schema):  
  `cd server && npx sequelize-cli db:migrate`  
  Resolve any failures before deploying to production.
- [ ] Check migration status: `cd server && npx sequelize-cli db:migrate:status`

### Deploy steps (staging / production)

1. **Backup** the production DB (or confirm automated backups).
2. **Run migrations** against the target DB **before** starting the new app version:
   ```bash
   cd server
   export NODE_ENV=production
   # set DATABASE_URL (or POSTGRES_*) for the target DB
   npx sequelize-cli db:migrate
   ```
3. **Deploy** the new code (e.g. pull, install, restart process).
4. **Smoke-check:**  
   - `GET /health` returns 200  
   - `GET /ready` returns 200 when DB and Redis are up  
   - One or two critical API calls succeed
5. **Monitor** logs and errors for a short period.

### Post-deploy

- [ ] Health/ready endpoints return 200
- [ ] No spike in 5xx or connection errors
- [ ] If something is wrong, follow **Rollback** below.

---

## Rollback guidance

### Application rollback (same DB schema)

If the **new code** is broken but **migrations have already been run** and the DB is fine:

1. Redeploy the **previous** application version (e.g. previous Git tag or release).
2. Restart the process. The app will connect to the current DB; no migration undo needed.
3. Re-verify health/ready and traffic.

### Database rollback (undo last migration)

If a **migration** caused the problem and you need to undo the **last** migration:

1. **Stop** the new app version (or point traffic away).
2. From the `server` directory, with the same DB URL:
   ```bash
   npx sequelize-cli db:migrate:undo
   ```
3. Confirm schema/state (e.g. re-run migrate:status, spot-check data).
4. Deploy the **previous** app version that does not depend on the reverted migration.
5. Restart and smoke-check.

### Undo multiple migrations

- Run `db:migrate:undo` repeatedly, or use:
  ```bash
  npx sequelize-cli db:migrate:undo --to <migration-name>.js
  ```
- Then deploy the app version that matches that schema.

### If rollback is risky (data or schema already changed)

- Prefer **fix-forward** (new migration or patch) if reverting would lose data or is complex.
- Restore from a **DB backup** only if you have a clear procedure and a recent backup; then redeploy the previous app version.

---

## How to run locally

### Prerequisites

- Node 18+ (or 20)
- PostgreSQL (e.g. Docker: `docker run -d -p 5434:5432 -e POSTGRES_PASSWORD=dev_password postgres`)
- Redis (e.g. `docker run -d -p 6379:6379 redis:alpine`)
- `.env` in `server/` with at least: `POSTGRES_*`, `REDIS_URL` (or default localhost), and any other required vars (see `.env.example` if present).

### Development (with sync)

```bash
cd server
npm install
# Optional: run migrations so schema matches migrations
npx sequelize-cli db:migrate
npm run dev
```

With `NODE_ENV` unset or `development`, the server will run `sync({ force: false })` at startup, so the DB can be created/updated from models without running migrations.

### Production-like (migrations only, no sync)

```bash
cd server
export NODE_ENV=production
npx sequelize-cli db:migrate   # apply migrations first
npm start
```

The server will **not** run `sync()`; it assumes the schema is already applied.

### Scripts reference

| Command | Description |
|--------|-------------|
| `npm start` | Run server (production entry) |
| `npm run dev` | Run with nodemon (development) |
| `npm test` | Run Jest tests |
| `npm run lint` | Syntax check entry file |
| `npm run build` | Same as lint (no bundle) |
| `npm run migration:validate` | Load all migration files; check up/down exist (no DB) |
| `npm run migration:status` | Show migration status (requires DB) |
| `npx sequelize-cli db:migrate` | Run pending migrations |
| `npx sequelize-cli db:migrate:undo` | Undo last migration |

---

## CI pipeline (GitHub Actions)

- **Workflow file:** `.github/workflows/ci.yml`
- **Triggers:** push/PR to `main` or `develop`
- **Job:** runs in `server/` directory
  - **Install:** `npm ci` (or `npm install` if no lock file)
  - **Lint:** `npm run lint`
  - **Test:** `npm test`
  - **Build:** `npm run build`
  - **Migration dry-run:** `npm run migration:validate` (validates migration files; no DB)

To run the same steps locally:

```bash
cd server
npm ci   # or npm install
npm run lint
npm test
npm run build
npm run migration:validate
```
