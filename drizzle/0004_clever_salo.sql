ALTER TABLE "authors" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "authors_is_archived_idx" ON "authors" USING btree ("is_archived");--> statement-breakpoint
CREATE INDEX "books_is_archived_idx" ON "books" USING btree ("is_archived");--> statement-breakpoint
CREATE INDEX "books_is_published_is_archived_idx" ON "books" USING btree ("is_published","is_archived");--> statement-breakpoint
DROP POLICY IF EXISTS "books_public_select" ON "books";--> statement-breakpoint
CREATE POLICY "books_public_select" ON "books" FOR SELECT TO anon, authenticated USING ("is_published" = true AND "is_archived" = false);--> statement-breakpoint
DROP POLICY IF EXISTS "book_authors_public_select" ON "book_authors";--> statement-breakpoint
CREATE POLICY "book_authors_public_select" ON "book_authors" FOR SELECT TO anon, authenticated USING (
	EXISTS (
		SELECT 1
		FROM public.books
		WHERE books.id = book_authors.book_id
			AND books.is_published = true
			AND books.is_archived = false
	)
);--> statement-breakpoint
DROP POLICY IF EXISTS "book_editions_public_select" ON "book_editions";--> statement-breakpoint
CREATE POLICY "book_editions_public_select" ON "book_editions" FOR SELECT TO anon, authenticated USING (
	"is_available" = true
	AND EXISTS (
		SELECT 1
		FROM public.books
		WHERE books.id = book_editions.book_id
			AND books.is_published = true
			AND books.is_archived = false
	)
);--> statement-breakpoint
DROP POLICY IF EXISTS "authors_public_select" ON "authors";--> statement-breakpoint
CREATE POLICY "authors_public_select" ON "authors" FOR SELECT TO anon, authenticated USING ("is_published" = true AND "is_archived" = false);--> statement-breakpoint
DROP POLICY IF EXISTS "authors_editorial_select" ON "authors";--> statement-breakpoint
CREATE POLICY "authors_editorial_select" ON "authors" FOR SELECT TO authenticated USING (public.is_editorial_staff());--> statement-breakpoint
DROP POLICY IF EXISTS "authors_editorial_insert" ON "authors";--> statement-breakpoint
CREATE POLICY "authors_editorial_insert" ON "authors" FOR INSERT TO authenticated WITH CHECK (public.is_editorial_staff());--> statement-breakpoint
DROP POLICY IF EXISTS "authors_editorial_update" ON "authors";--> statement-breakpoint
CREATE POLICY "authors_editorial_update" ON "authors" FOR UPDATE TO authenticated USING (public.is_editorial_staff()) WITH CHECK (public.is_editorial_staff());--> statement-breakpoint
DROP POLICY IF EXISTS "authors_editorial_delete" ON "authors";--> statement-breakpoint
CREATE POLICY "authors_editorial_delete" ON "authors" FOR DELETE TO authenticated USING (public.is_editorial_staff());
