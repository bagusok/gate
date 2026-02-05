ALTER TABLE "plans" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "features" jsonb DEFAULT '[]'::jsonb;