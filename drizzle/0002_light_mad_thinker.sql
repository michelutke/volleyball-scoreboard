CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"swiss_volley_team_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "team_id" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "overlay_bg" text DEFAULT '#1a1a1a' NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "overlay_bg2" text DEFAULT '#1a1a1a' NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "overlay_bg_gradient" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "overlay_text" text DEFAULT '#ffffff' NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "overlay_rounded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "scheduled_at" timestamp;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "venue" text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "league" text;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;