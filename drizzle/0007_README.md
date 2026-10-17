# 0007 Kinetic Scoreboard — Manual Migration on Coolify

Per-match scoreboard layout selection.

## What this adds

```sql
ALTER TABLE matches ADD COLUMN scoreboard_layout text;
ALTER TABLE matches ADD COLUMN scoreboard_options jsonb;
```

Both nullable — `NULL` means "use org default". Org default is stored in the existing `settings` KV table under keys:
- `defaultScoreboardLayout` (text, e.g. `'classic'` | `'kinetic'`)
- `defaultScoreboardOptions` (text — stringified JSON)

No new tables. Theme/motion preferences are cookie-based (no DB).

## Run on Coolify

Migrations do **not** auto-apply on redeploy. Run manually:

```sh
psql "$DATABASE_URL" -f drizzle/0007_kinetic_scoreboard.sql
```

The SQL uses `IF NOT EXISTS` so it is idempotent — safe to re-run.

## Resolution order at runtime

1. `matches.scoreboardLayout` → if set, use it
2. else `settings[defaultScoreboardLayout]` (org default, set via `/library` page)
3. else `'classic'` (fallback in `getLayout()`)

Same chain for options.
