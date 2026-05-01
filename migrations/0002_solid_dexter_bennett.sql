ALTER TABLE "uploaded_file" ADD COLUMN "upload_name" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "uploaded_file" ADD COLUMN "first_row_is_header" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "uploaded_file" ADD COLUMN "email_column" integer;--> statement-breakpoint
ALTER TABLE "uploaded_file" ADD COLUMN "linkedin_column" integer;--> statement-breakpoint
ALTER TABLE "uploaded_file" ADD COLUMN "company_name_column" integer;--> statement-breakpoint
ALTER TABLE "uploaded_file" ADD COLUMN "company_website_column" integer;--> statement-breakpoint
ALTER TABLE "uploaded_file" ADD COLUMN "row_count" integer DEFAULT 0 NOT NULL;
