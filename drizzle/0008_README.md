# 0008 Match finished_at: Manual Migration on Coolify

Start of the guest link grace period (see `docs/mobile-api.md`).

## What this adds

```sql
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "finished_at" timestamp;
```

Nullable. Set when a match becomes `finished`, cleared on undo back to `live`.

## Run on Coolify

Migrations do **not** auto-apply on redeploy. Run this **before** deploying code that includes the column, otherwise every query on `matches` fails:

```sh
psql "$DATABASE_URL" -f drizzle/0008_match_finished_at.sql
```

Or in the Coolify Postgres resource terminal: `psql -U <user> -d <db>`, paste the `ALTER`, check with `\d matches`.

The SQL uses `IF NOT EXISTS`, so it is idempotent and safe to re-run.

## Status

Applied on prod on 2026-10-15, before PR #149 was deployed.
