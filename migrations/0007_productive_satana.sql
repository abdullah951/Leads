CREATE TABLE "team_member" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"user_id" integer,
	"invited_email" text NOT NULL,
	"name" text,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"credit_quota" integer DEFAULT 0 NOT NULL,
	"credits_used" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"low_credit_alert" boolean DEFAULT false NOT NULL,
	"invite_token" text,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	"joined_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "team_member_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;