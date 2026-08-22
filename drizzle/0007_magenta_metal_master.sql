CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"short_description" varchar(500),
	"description" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "services_slug_unique_idx" ON "services" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "services_is_published_idx" ON "services" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "services_is_featured_is_published_idx" ON "services" USING btree ("is_featured","is_published");--> statement-breakpoint
CREATE INDEX "services_is_archived_idx" ON "services" USING btree ("is_archived");--> statement-breakpoint
CREATE INDEX "services_sort_order_idx" ON "services" USING btree ("sort_order");