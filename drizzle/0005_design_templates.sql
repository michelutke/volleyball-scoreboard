CREATE TABLE IF NOT EXISTS "design_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text DEFAULT 'default' NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"overlay_bg" text DEFAULT '#1a1a1a' NOT NULL,
	"overlay_bg2" text DEFAULT '#1a1a1a' NOT NULL,
	"overlay_bg_gradient" boolean DEFAULT false NOT NULL,
	"overlay_text" text DEFAULT '#ffffff' NOT NULL,
	"overlay_rounded" boolean DEFAULT false NOT NULL,
	"overlay_divider" text DEFAULT '#2a2a2a' NOT NULL,
	"overlay_sats_bg" text DEFAULT '#1a1a1a' NOT NULL,
	"overlay_set_score_bg" text DEFAULT '#1a1a1a' NOT NULL,
	"score_color" text DEFAULT '#1a1a1a' NOT NULL,
	"score_color2" text DEFAULT '#1a1a1a' NOT NULL,
	"score_color_gradient" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "design_template_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_design_template_id_design_templates_id_fk" FOREIGN KEY ("design_template_id") REFERENCES "public"."design_templates"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
