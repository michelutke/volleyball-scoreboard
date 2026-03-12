ALTER TABLE "design_templates" ADD COLUMN "custom_code" text;
ALTER TABLE "design_templates" ADD COLUMN "is_public" boolean NOT NULL DEFAULT false;
ALTER TABLE "design_templates" ADD COLUMN "description" text;
