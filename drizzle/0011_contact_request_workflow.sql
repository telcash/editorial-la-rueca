CREATE TABLE "contact_request_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_request_id" uuid NOT NULL,
	"author_profile_id" uuid,
	"body" text NOT NULL,
	"is_legacy" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_request_notes_body_check" CHECK (
		"is_legacy" = true OR (
			char_length("body") BETWEEN 1 AND 10000
			AND btrim("body", ' ' || chr(9) || chr(10) || chr(11) || chr(12) || chr(13)) <> ''
		)
	),
	CONSTRAINT "contact_request_notes_author_check" CHECK ("is_legacy" = true OR "author_profile_id" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "contact_request_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "contact_request_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_request_id" uuid NOT NULL,
	"previous_status" varchar(40),
	"new_status" varchar(40) NOT NULL,
	"changed_by_profile_id" uuid,
	"is_legacy" boolean DEFAULT false NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_request_status_history_actor_check" CHECK ("is_legacy" = true OR "changed_by_profile_id" IS NOT NULL),
	CONSTRAINT "contact_request_status_history_transition_check" CHECK ("contact_request_status_history"."previous_status" is null or "contact_request_status_history"."previous_status" <> "contact_request_status_history"."new_status")
);
--> statement-breakpoint
ALTER TABLE "contact_request_status_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "contact_request_statuses" (
	"key" varchar(40) PRIMARY KEY NOT NULL,
	"label" varchar(80) NOT NULL,
	"classification" varchar(8) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_request_statuses_key_check" CHECK (char_length("key") >= 2 AND "key" ~ '^[a-z][a-z0-9]*(_[a-z0-9]+)*$'),
	CONSTRAINT "contact_request_statuses_label_check" CHECK (btrim("label") <> ''),
	CONSTRAINT "contact_request_statuses_classification_check" CHECK ("contact_request_statuses"."classification" in ('open', 'won', 'lost')),
	CONSTRAINT "contact_request_statuses_sort_order_check" CHECK ("sort_order" BETWEEN 0 AND 10000),
	CONSTRAINT "contact_request_statuses_initial_active_check" CHECK ("contact_request_statuses"."key" <> 'new' OR "contact_request_statuses"."is_active" = true)
);
--> statement-breakpoint
ALTER TABLE "contact_request_statuses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contact_request_notes" ADD CONSTRAINT "contact_request_notes_contact_request_id_contact_requests_id_fk" FOREIGN KEY ("contact_request_id") REFERENCES "public"."contact_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_request_notes" ADD CONSTRAINT "contact_request_notes_author_profile_id_profiles_id_fk" FOREIGN KEY ("author_profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_request_status_history" ADD CONSTRAINT "contact_request_status_history_contact_request_id_contact_requests_id_fk" FOREIGN KEY ("contact_request_id") REFERENCES "public"."contact_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_request_status_history" ADD CONSTRAINT "contact_request_status_history_previous_status_contact_request_statuses_key_fk" FOREIGN KEY ("previous_status") REFERENCES "public"."contact_request_statuses"("key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_request_status_history" ADD CONSTRAINT "contact_request_status_history_new_status_contact_request_statuses_key_fk" FOREIGN KEY ("new_status") REFERENCES "public"."contact_request_statuses"("key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_request_status_history" ADD CONSTRAINT "contact_request_status_history_changed_by_profile_id_profiles_id_fk" FOREIGN KEY ("changed_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_request_notes_request_created_idx" ON "contact_request_notes" USING btree ("contact_request_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_request_notes_legacy_request_unique" ON "contact_request_notes" USING btree ("contact_request_id") WHERE "contact_request_notes"."is_legacy" = true;--> statement-breakpoint
CREATE INDEX "contact_request_status_history_request_changed_idx" ON "contact_request_status_history" USING btree ("contact_request_id","changed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_request_status_history_legacy_request_unique" ON "contact_request_status_history" USING btree ("contact_request_id") WHERE "contact_request_status_history"."is_legacy" = true;--> statement-breakpoint
CREATE INDEX "contact_request_statuses_active_order_idx" ON "contact_request_statuses" USING btree ("is_active","sort_order");--> statement-breakpoint
INSERT INTO "contact_request_statuses" ("key", "label", "classification", "sort_order", "is_active") VALUES
	('new', 'Nuevo', 'open', 10, true),
	('contacted', 'Contactado', 'open', 20, true),
	('in_progress', 'En seguimiento', 'open', 30, true),
	('no_answer', 'No contesta', 'open', 40, true),
	('won', 'Ganado', 'won', 50, true),
	('lost', 'Perdido', 'lost', 60, true)
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
DO $migration$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "contact_requests" AS request
		LEFT JOIN "contact_request_statuses" AS status ON status."key" = request."status"
		WHERE status."key" IS NULL
	) THEN
		RAISE EXCEPTION 'contact_requests contains a status not present in the seeded status catalog.'
			USING ERRCODE = '23503';
	END IF;
END;
$migration$;--> statement-breakpoint
INSERT INTO "contact_request_notes" ("contact_request_id", "body", "is_legacy")
SELECT "id", "internal_notes", true
FROM "contact_requests"
WHERE "internal_notes" IS NOT NULL
ON CONFLICT ("contact_request_id") WHERE "is_legacy" = true DO NOTHING;--> statement-breakpoint
INSERT INTO "contact_request_status_history" (
	"contact_request_id", "previous_status", "new_status", "changed_by_profile_id", "is_legacy"
)
SELECT "id", NULL, "status", NULL, true
FROM "contact_requests"
ON CONFLICT ("contact_request_id") WHERE "is_legacy" = true DO NOTHING;--> statement-breakpoint
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_status_contact_request_statuses_key_fk" FOREIGN KEY ("status") REFERENCES "public"."contact_request_statuses"("key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "contact_request_statuses_editorial_select" ON "contact_request_statuses" AS PERMISSIVE FOR SELECT TO authenticated USING (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "contact_request_statuses_admin_insert" ON "contact_request_statuses" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (
	EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
);--> statement-breakpoint
CREATE POLICY "contact_request_statuses_admin_update" ON "contact_request_statuses" AS PERMISSIVE FOR UPDATE TO authenticated USING (
	EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
) WITH CHECK (
	EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
);--> statement-breakpoint
CREATE POLICY "contact_request_notes_editorial_select" ON "contact_request_notes" AS PERMISSIVE FOR SELECT TO authenticated USING (public.is_editorial_staff());--> statement-breakpoint
CREATE POLICY "contact_request_notes_editorial_insert" ON "contact_request_notes" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (
	public.is_editorial_staff()
	AND "author_profile_id" = (SELECT auth.uid())
	AND "is_legacy" = false
);--> statement-breakpoint
CREATE POLICY "contact_request_status_history_editorial_select" ON "contact_request_status_history" AS PERMISSIVE FOR SELECT TO authenticated USING (public.is_editorial_staff());--> statement-breakpoint
REVOKE ALL ON TABLE "contact_request_statuses", "contact_request_notes", "contact_request_status_history" FROM anon;--> statement-breakpoint
REVOKE ALL ON TABLE "contact_request_statuses", "contact_request_notes", "contact_request_status_history" FROM authenticated;--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "contact_request_statuses" TO authenticated;--> statement-breakpoint
GRANT UPDATE ("label", "sort_order", "is_active", "updated_at") ON TABLE "contact_request_statuses" TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "contact_request_notes" TO authenticated;--> statement-breakpoint
GRANT SELECT ON TABLE "contact_request_status_history" TO authenticated;--> statement-breakpoint
REVOKE UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;--> statement-breakpoint
GRANT UPDATE (display_name, avatar_url) ON TABLE public.profiles TO authenticated;
