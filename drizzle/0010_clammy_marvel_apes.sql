ALTER TABLE "contact_requests" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_requests" ALTER COLUMN "province" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_requests" ALTER COLUMN "service_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_requests" ADD COLUMN "meta_lead_id" varchar(128);--> statement-breakpoint
ALTER TABLE "contact_requests" ADD COLUMN "meta_form_id" varchar(128);--> statement-breakpoint
ALTER TABLE "contact_requests" ADD COLUMN "meta_form_name" varchar(255);--> statement-breakpoint
CREATE UNIQUE INDEX "contact_requests_meta_lead_id_unique" ON "contact_requests" USING btree ("meta_lead_id");