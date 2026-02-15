CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"home_team_name" text DEFAULT 'Heim' NOT NULL,
	"guest_team_name" text DEFAULT 'Gast' NOT NULL,
	"home_jersey_color" text DEFAULT '#1e40af' NOT NULL,
	"guest_jersey_color" text DEFAULT '#dc2626' NOT NULL,
	"show_jersey_colors" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"swiss_volley_match_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"home_points" integer DEFAULT 0 NOT NULL,
	"guest_points" integer DEFAULT 0 NOT NULL,
	"home_sets" integer DEFAULT 0 NOT NULL,
	"guest_sets" integer DEFAULT 0 NOT NULL,
	"current_set" integer DEFAULT 1 NOT NULL,
	"set_scores" jsonb DEFAULT '[]' NOT NULL,
	"service_team" text DEFAULT 'home' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"team" text NOT NULL,
	"set" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeouts" ADD CONSTRAINT "timeouts_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;