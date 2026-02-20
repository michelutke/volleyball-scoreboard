ALTER TABLE "matches" ADD COLUMN "org_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "org_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "org_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" DROP CONSTRAINT "settings_pkey";--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_org_id_key_pk" PRIMARY KEY("org_id","key");
