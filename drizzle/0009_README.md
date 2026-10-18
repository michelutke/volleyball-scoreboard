# 0009 Org images: Manual Migration on Coolify

Club photo and club logo for the stream thumbnails (see `docs/mobile-api.md`).

## What this adds

```sql
CREATE TABLE IF NOT EXISTS "org_images" (
	"org_id" text NOT NULL,
	"kind" text NOT NULL,
	"content_type" text NOT NULL,
	"data" bytea NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_images_org_id_kind_pk" PRIMARY KEY("org_id","kind")
);
```

One row per org and kind (`thumbnail_photo`, `club_logo`), at most 5 MB each.

## Run on Coolify

Migrations do **not** auto-apply on redeploy. Run this **before** deploying code that uses the table, otherwise the settings page and the thumbnail endpoints fail:

```sh
psql "$DATABASE_URL" -f drizzle/0009_org_images.sql
```

The SQL uses `IF NOT EXISTS`, so it is idempotent and safe to re-run.

## Status

Not applied on prod yet.
