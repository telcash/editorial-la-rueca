CREATE TABLE "author_testimonials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"book_id" uuid,
	"quote" text NOT NULL,
	"source" text,
	"rating" integer,
	"is_published" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "author_testimonials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "author_testimonials" ADD CONSTRAINT "author_testimonials_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "author_testimonials" ADD CONSTRAINT "author_testimonials_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "author_testimonials_author_id_idx" ON "author_testimonials" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "author_testimonials_book_id_idx" ON "author_testimonials" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "author_testimonials_is_published_idx" ON "author_testimonials" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "author_testimonials_is_published_is_featured_idx" ON "author_testimonials" USING btree ("is_published","is_featured");--> statement-breakpoint
CREATE INDEX "author_testimonials_sort_order_idx" ON "author_testimonials" USING btree ("sort_order");