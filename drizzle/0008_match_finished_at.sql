-- Start of the guest link grace period: set when a match becomes finished, cleared on undo back to live.
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "finished_at" timestamp;
