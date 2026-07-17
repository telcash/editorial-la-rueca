CREATE TABLE "books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(220) NOT NULL,
	"subtitle" varchar(220),
	"slug" varchar(220) NOT NULL,
	"description" text,
	"excerpt" text,
	"cover_url" text,
	"original_publication_date" date,
	"language" varchar(3),
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"meta_title" varchar(160),
	"meta_description" text,
	"canonical_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "books" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "book_authors" (
	"book_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "book_authors_pk" PRIMARY KEY("book_id","author_id")
);
--> statement-breakpoint
ALTER TABLE "book_authors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "book_editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"format" varchar(40) NOT NULL,
	"edition_label" varchar(120),
	"publication_date" date,
	"isbn10" varchar(10),
	"isbn13" varchar(13),
	"price" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"pages" integer,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "book_editions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "book_authors" ADD CONSTRAINT "book_authors_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_authors" ADD CONSTRAINT "book_authors_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_editions" ADD CONSTRAINT "book_editions_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "book_authors_book_id_idx" ON "book_authors" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "book_authors_author_id_idx" ON "book_authors" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "book_authors_book_id_sort_order_idx" ON "book_authors" USING btree ("book_id","sort_order");--> statement-breakpoint
CREATE INDEX "book_editions_book_id_idx" ON "book_editions" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "book_editions_book_id_sort_order_idx" ON "book_editions" USING btree ("book_id","sort_order");--> statement-breakpoint
CREATE INDEX "book_editions_format_idx" ON "book_editions" USING btree ("format");--> statement-breakpoint
CREATE INDEX "book_editions_publication_date_idx" ON "book_editions" USING btree ("publication_date");--> statement-breakpoint
CREATE INDEX "book_editions_is_available_idx" ON "book_editions" USING btree ("is_available");--> statement-breakpoint
CREATE INDEX "book_editions_book_id_is_available_idx" ON "book_editions" USING btree ("book_id","is_available");--> statement-breakpoint
CREATE UNIQUE INDEX "book_editions_isbn10_unique_idx" ON "book_editions" USING btree ("isbn10") WHERE "book_editions"."isbn10" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "book_editions_isbn13_unique_idx" ON "book_editions" USING btree ("isbn13") WHERE "book_editions"."isbn13" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "books_slug_unique_idx" ON "books" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "books_is_published_idx" ON "books" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "books_is_published_is_featured_idx" ON "books" USING btree ("is_published","is_featured");--> statement-breakpoint
CREATE INDEX "books_original_publication_date_idx" ON "books" USING btree ("original_publication_date");--> statement-breakpoint
CREATE INDEX "books_sort_order_idx" ON "books" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "books_created_at_idx" ON "books" USING btree ("created_at");--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.is_editorial_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
	SELECT EXISTS (
		SELECT 1
		FROM public.profiles
		WHERE profiles.id = auth.uid()
			AND profiles.role IN ('admin', 'editor')
	);
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.is_editorial_staff() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_editorial_staff() TO authenticated;--> statement-breakpoint
CREATE POLICY "books_public_select" ON "books" FOR SELECT TO anon, authenticated USING ("is_published" = true);--> statement-breakpoint
CREATE POLICY "books_editorial_select" ON "books" FOR SELECT TO authenticated USING (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "books_editorial_insert" ON "books" FOR INSERT TO authenticated WITH CHECK (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "books_editorial_update" ON "books" FOR UPDATE TO authenticated USING (public.is_editorial_staff()) WITH CHECK (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "books_editorial_delete" ON "books" FOR DELETE TO authenticated USING (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "book_authors_public_select" ON "book_authors" FOR SELECT TO anon, authenticated USING (
	EXISTS (
		SELECT 1
		FROM public.books
		WHERE books.id = book_authors.book_id
			AND books.is_published = true
	)
);--> statement-breakpoint
CREATE POLICY "book_authors_editorial_select" ON "book_authors" FOR SELECT TO authenticated USING (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "book_authors_editorial_insert" ON "book_authors" FOR INSERT TO authenticated WITH CHECK (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "book_authors_editorial_update" ON "book_authors" FOR UPDATE TO authenticated USING (public.is_editorial_staff()) WITH CHECK (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "book_authors_editorial_delete" ON "book_authors" FOR DELETE TO authenticated USING (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "book_editions_public_select" ON "book_editions" FOR SELECT TO anon, authenticated USING (
	"is_available" = true
	AND EXISTS (
		SELECT 1
		FROM public.books
		WHERE books.id = book_editions.book_id
			AND books.is_published = true
	)
);--> statement-breakpoint
CREATE POLICY "book_editions_editorial_select" ON "book_editions" FOR SELECT TO authenticated USING (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "book_editions_editorial_insert" ON "book_editions" FOR INSERT TO authenticated WITH CHECK (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "book_editions_editorial_update" ON "book_editions" FOR UPDATE TO authenticated USING (public.is_editorial_staff()) WITH CHECK (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "book_editions_editorial_delete" ON "book_editions" FOR DELETE TO authenticated USING (public.is_editorial_staff());
