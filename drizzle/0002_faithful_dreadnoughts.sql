CREATE TABLE "public"."authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"short_bio" varchar(500),
	"biography" text,
	"photo_url" text,
	"website_url" text,
	"instagram_url" text,
	"facebook_url" text,
	"country" varchar(100),
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public"."authors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "authors_slug_unique_idx" ON "public"."authors" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "authors_is_published_idx" ON "public"."authors" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "authors_is_featured_is_published_idx" ON "public"."authors" USING btree ("is_featured","is_published");--> statement-breakpoint
CREATE INDEX "authors_sort_order_idx" ON "public"."authors" USING btree ("sort_order");
