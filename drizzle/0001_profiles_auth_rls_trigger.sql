CREATE POLICY "profiles_select_own"
ON "public"."profiles"
FOR SELECT
TO authenticated
USING ((select auth.uid()) = "id");--> statement-breakpoint

CREATE POLICY "profiles_update_own"
ON "public"."profiles"
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = "id")
WITH CHECK ((select auth.uid()) = "id");--> statement-breakpoint

CREATE FUNCTION "public"."handle_new_user"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO "public"."profiles" ("id", "display_name", "avatar_url")
  VALUES (
    NEW."id",
    NEW."raw_user_meta_data" ->> 'display_name',
    NEW."raw_user_meta_data" ->> 'avatar_url'
  )
  ON CONFLICT ("id") DO NOTHING;

  RETURN NEW;
END;
$$;--> statement-breakpoint

REVOKE EXECUTE ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION "public"."handle_new_user"() FROM anon;
REVOKE EXECUTE ON FUNCTION "public"."handle_new_user"() FROM authenticated;

CREATE TRIGGER "on_auth_user_created"
AFTER INSERT ON "auth"."users"
FOR EACH ROW
EXECUTE FUNCTION "public"."handle_new_user"();
