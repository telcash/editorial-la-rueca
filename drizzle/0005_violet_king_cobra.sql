CREATE TABLE "book_categories" (
	"book_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "book_categories_pk" PRIMARY KEY("book_id","category_id")
);
--> statement-breakpoint
ALTER TABLE "book_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"description" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "book_categories" ADD CONSTRAINT "book_categories_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_categories" ADD CONSTRAINT "book_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "book_categories_book_id_idx" ON "book_categories" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "book_categories_category_id_idx" ON "book_categories" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_unique_idx" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_is_archived_idx" ON "categories" USING btree ("is_archived");--> statement-breakpoint
CREATE INDEX "categories_is_published_idx" ON "categories" USING btree ("is_published");--> statement-breakpoint
CREATE POLICY "categories_public_select" ON "categories" AS PERMISSIVE FOR SELECT TO anon, authenticated USING ("is_published" = true AND "is_archived" = false);--> statement-breakpoint
CREATE POLICY "categories_editorial_select" ON "categories" AS PERMISSIVE FOR SELECT TO authenticated USING (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "categories_editorial_insert" ON "categories" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "categories_editorial_update" ON "categories" AS PERMISSIVE FOR UPDATE TO authenticated USING (public.is_editorial_staff()) WITH CHECK (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "categories_editorial_delete" ON "categories" AS PERMISSIVE FOR DELETE TO authenticated USING (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "book_categories_public_select" ON "book_categories" AS PERMISSIVE FOR SELECT TO anon, authenticated USING (
	EXISTS (
		SELECT 1
		FROM public.books
		WHERE public.books.id = book_categories.book_id
			AND public.books.is_published = true
			AND public.books.is_archived = false
	)
	AND EXISTS (
		SELECT 1
		FROM public.categories
		WHERE public.categories.id = book_categories.category_id
			AND public.categories.is_published = true
			AND public.categories.is_archived = false
	)
);--> statement-breakpoint
CREATE POLICY "book_categories_editorial_select" ON "book_categories" AS PERMISSIVE FOR SELECT TO authenticated USING (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "book_categories_editorial_insert" ON "book_categories" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "book_categories_editorial_update" ON "book_categories" AS PERMISSIVE FOR UPDATE TO authenticated USING (public.is_editorial_staff()) WITH CHECK (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "book_categories_editorial_delete" ON "book_categories" AS PERMISSIVE FOR DELETE TO authenticated USING (public.is_editorial_staff());
