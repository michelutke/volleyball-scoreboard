CREATE TABLE IF NOT EXISTS "org_images" (
	"org_id" text NOT NULL,
	"kind" text NOT NULL,
	"content_type" text NOT NULL,
	"data" bytea NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_images_org_id_kind_pk" PRIMARY KEY("org_id","kind")
);
