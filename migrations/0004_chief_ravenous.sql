CREATE TABLE IF NOT EXISTS "company" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "company_company_name_unique" UNIQUE("company_name")
);
--> statement-breakpoint
ALTER TABLE "lead_data" ADD COLUMN IF NOT EXISTS "website_url" text;--> statement-breakpoint
ALTER TABLE "lead_data" ADD COLUMN IF NOT EXISTS "company_id" integer;--> statement-breakpoint
ALTER TABLE "lead_data" ADD CONSTRAINT "lead_data_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_data" DROP COLUMN IF EXISTS "company_name";
