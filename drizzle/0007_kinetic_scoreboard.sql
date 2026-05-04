-- Adds per-match scoreboard layout selection (P8 of Kinetic redesign).
-- Org default lives in `settings` KV table under keys:
--   defaultScoreboardLayout (text)
--   defaultScoreboardOptions (jsonb-as-text)
-- Per-match override columns (NULL means fall back to org default):
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "scoreboard_layout" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "scoreboard_options" jsonb;
