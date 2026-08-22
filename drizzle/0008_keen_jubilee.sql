CREATE TABLE "contact_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"email" varchar(254) NOT NULL,
	"phone" varchar(80) NOT NULL,
	"province" varchar(120) NOT NULL,
	"service_id" uuid NOT NULL,
	"message" text NOT NULL,
	"status" varchar(40) DEFAULT 'new' NOT NULL,
	"source" varchar(40) DEFAULT 'website' NOT NULL,
	"utm_source" varchar(160),
	"utm_medium" varchar(160),
	"utm_campaign" varchar(180),
	"utm_content" varchar(180),
	"utm_term" varchar(180),
	"email_sent_at" timestamp with time zone,
	"email_error" text,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_requests_service_id_idx" ON "contact_requests" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "contact_requests_status_idx" ON "contact_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contact_requests_source_idx" ON "contact_requests" USING btree ("source");--> statement-breakpoint
CREATE INDEX "contact_requests_created_at_idx" ON "contact_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "contact_requests_service_id_status_idx" ON "contact_requests" USING btree ("service_id","status");--> statement-breakpoint
CREATE INDEX "contact_requests_status_created_at_idx" ON "contact_requests" USING btree ("status","created_at");