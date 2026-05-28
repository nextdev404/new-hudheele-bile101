# Hudheele POS Backend

## Setup
1. Copy `.env.example` to `.env` and fill values.
2. Ensure PostgreSQL database exists.
3. Run:
   - `npm install`
   - `npm run migrate`
   - `npm run seed`
   - `npm run dev`

## API Base
- `http://localhost:4000/api`

## Notes
- Customer flow is public browse only (`/api/public/*`), no PIN.
- Staff use `/api/auth/login` with `name` and `pin`.
- Daily sync worker runs automatically every `SYNC_INTERVAL_HOURS` and syncs unsynced records to `CLOUD_DATABASE_URL`.
- Manual/admin sync endpoints:
  - `GET /api/admin/sync/status`
  - `POST /api/admin/sync/run`
