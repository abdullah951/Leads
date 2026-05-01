ALTER TABLE "revealed_contact" ADD COLUMN "work_email_status" varchar(20);--> statement-breakpoint
ALTER TABLE "revealed_contact" ADD COLUMN "personal_email_status" varchar(20);--> statement-breakpoint
ALTER TABLE "revealed_contact" ADD COLUMN "credit_refunded" boolean DEFAULT false NOT NULL;