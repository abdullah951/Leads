CREATE TABLE "user_favorite" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"lead_id" integer NOT NULL,
	"tag_name" text DEFAULT '' NOT NULL,
	"tag_color" text DEFAULT '#6366f1' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_favorite" ADD CONSTRAINT "user_favorite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorite" ADD CONSTRAINT "user_favorite_lead_id_lead_data_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead_data"("id") ON DELETE cascade ON UPDATE no action;