CREATE TABLE "book_sales_market_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_sales_product_id" uuid NOT NULL,
	"sales_channel_market_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "book_sales_market_availability" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "book_sales_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"sales_channel_id" uuid NOT NULL,
	"external_product_id" varchar(255),
	"purchase_url" text,
	"status" varchar(40) DEFAULT 'available' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "book_sales_products_status_check" CHECK ("book_sales_products"."status" in ('available', 'unavailable', 'external_account', 'pending'))
);
--> statement-breakpoint
ALTER TABLE "book_sales_products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales_channel_markets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sales_channel_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"country_code" varchar(10),
	"base_url" text NOT NULL,
	"product_url_template" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales_channel_markets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(140) NOT NULL,
	"website_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales_channels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "book_sales_market_availability" ADD CONSTRAINT "book_sales_market_availability_book_sales_product_id_book_sales_products_id_fk" FOREIGN KEY ("book_sales_product_id") REFERENCES "public"."book_sales_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_sales_market_availability" ADD CONSTRAINT "book_sales_market_availability_sales_channel_market_id_sales_channel_markets_id_fk" FOREIGN KEY ("sales_channel_market_id") REFERENCES "public"."sales_channel_markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_sales_products" ADD CONSTRAINT "book_sales_products_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_sales_products" ADD CONSTRAINT "book_sales_products_sales_channel_id_sales_channels_id_fk" FOREIGN KEY ("sales_channel_id") REFERENCES "public"."sales_channels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_channel_markets" ADD CONSTRAINT "sales_channel_markets_sales_channel_id_sales_channels_id_fk" FOREIGN KEY ("sales_channel_id") REFERENCES "public"."sales_channels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "book_sales_market_availability_product_market_unique_idx" ON "book_sales_market_availability" USING btree ("book_sales_product_id","sales_channel_market_id");--> statement-breakpoint
CREATE INDEX "book_sales_market_availability_product_id_idx" ON "book_sales_market_availability" USING btree ("book_sales_product_id");--> statement-breakpoint
CREATE INDEX "book_sales_market_availability_market_id_idx" ON "book_sales_market_availability" USING btree ("sales_channel_market_id");--> statement-breakpoint
CREATE UNIQUE INDEX "book_sales_products_book_id_sales_channel_id_unique_idx" ON "book_sales_products" USING btree ("book_id","sales_channel_id");--> statement-breakpoint
CREATE INDEX "book_sales_products_book_id_idx" ON "book_sales_products" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "book_sales_products_sales_channel_id_idx" ON "book_sales_products" USING btree ("sales_channel_id");--> statement-breakpoint
CREATE INDEX "book_sales_products_status_idx" ON "book_sales_products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "book_sales_products_is_active_idx" ON "book_sales_products" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "book_sales_products_sort_order_idx" ON "book_sales_products" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "sales_channel_markets_sales_channel_id_idx" ON "sales_channel_markets" USING btree ("sales_channel_id");--> statement-breakpoint
CREATE INDEX "sales_channel_markets_is_active_idx" ON "sales_channel_markets" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "sales_channel_markets_sort_order_idx" ON "sales_channel_markets" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_channels_slug_unique_idx" ON "sales_channels" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "sales_channels_is_active_idx" ON "sales_channels" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "sales_channels_sort_order_idx" ON "sales_channels" USING btree ("sort_order");--> statement-breakpoint
CREATE POLICY "sales_channels_public_select" ON "sales_channels" AS PERMISSIVE FOR SELECT TO anon, authenticated USING ("is_active" = true);--> statement-breakpoint
CREATE POLICY "sales_channels_editorial_select" ON "sales_channels" AS PERMISSIVE FOR SELECT TO authenticated USING (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "sales_channels_editorial_insert" ON "sales_channels" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "sales_channels_editorial_update" ON "sales_channels" AS PERMISSIVE FOR UPDATE TO authenticated USING (public.is_editorial_staff()) WITH CHECK (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "sales_channels_editorial_delete" ON "sales_channels" AS PERMISSIVE FOR DELETE TO authenticated USING (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "sales_channel_markets_public_select" ON "sales_channel_markets" AS PERMISSIVE FOR SELECT TO anon, authenticated USING (
	"is_active" = true
	AND EXISTS (
		SELECT 1
		FROM public.sales_channels
		WHERE public.sales_channels.id = sales_channel_markets.sales_channel_id
			AND public.sales_channels.is_active = true
	)
);--> statement-breakpoint
CREATE POLICY "sales_channel_markets_editorial_select" ON "sales_channel_markets" AS PERMISSIVE FOR SELECT TO authenticated USING (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "sales_channel_markets_editorial_insert" ON "sales_channel_markets" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "sales_channel_markets_editorial_update" ON "sales_channel_markets" AS PERMISSIVE FOR UPDATE TO authenticated USING (public.is_editorial_staff()) WITH CHECK (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "sales_channel_markets_editorial_delete" ON "sales_channel_markets" AS PERMISSIVE FOR DELETE TO authenticated USING (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "book_sales_products_public_select" ON "book_sales_products" AS PERMISSIVE FOR SELECT TO anon, authenticated USING (
	"is_active" = true
	AND "status" = 'available'
	AND EXISTS (
		SELECT 1
		FROM public.books
		WHERE public.books.id = book_sales_products.book_id
			AND public.books.is_published = true
			AND public.books.is_archived = false
	)
	AND EXISTS (
		SELECT 1
		FROM public.sales_channels
		WHERE public.sales_channels.id = book_sales_products.sales_channel_id
			AND public.sales_channels.is_active = true
	)
);--> statement-breakpoint
CREATE POLICY "book_sales_products_editorial_select" ON "book_sales_products" AS PERMISSIVE FOR SELECT TO authenticated USING (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "book_sales_products_editorial_insert" ON "book_sales_products" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "book_sales_products_editorial_update" ON "book_sales_products" AS PERMISSIVE FOR UPDATE TO authenticated USING (public.is_editorial_staff()) WITH CHECK (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "book_sales_products_editorial_delete" ON "book_sales_products" AS PERMISSIVE FOR DELETE TO authenticated USING (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "book_sales_market_availability_public_select" ON "book_sales_market_availability" AS PERMISSIVE FOR SELECT TO anon, authenticated USING (
	EXISTS (
		SELECT 1
		FROM public.book_sales_products
		INNER JOIN public.books
			ON public.books.id = public.book_sales_products.book_id
		INNER JOIN public.sales_channels
			ON public.sales_channels.id = public.book_sales_products.sales_channel_id
		WHERE public.book_sales_products.id = book_sales_market_availability.book_sales_product_id
			AND public.book_sales_products.is_active = true
			AND public.book_sales_products.status = 'available'
			AND public.books.is_published = true
			AND public.books.is_archived = false
			AND public.sales_channels.is_active = true
	)
	AND EXISTS (
		SELECT 1
		FROM public.sales_channel_markets
		WHERE public.sales_channel_markets.id = book_sales_market_availability.sales_channel_market_id
			AND public.sales_channel_markets.is_active = true
	)
);--> statement-breakpoint
CREATE POLICY "book_sales_market_availability_editorial_select" ON "book_sales_market_availability" AS PERMISSIVE FOR SELECT TO authenticated USING (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "book_sales_market_availability_editorial_insert" ON "book_sales_market_availability" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "book_sales_market_availability_editorial_update" ON "book_sales_market_availability" AS PERMISSIVE FOR UPDATE TO authenticated USING (public.is_editorial_staff()) WITH CHECK (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "book_sales_market_availability_editorial_delete" ON "book_sales_market_availability" AS PERMISSIVE FOR DELETE TO authenticated USING (public.is_editorial_staff());
