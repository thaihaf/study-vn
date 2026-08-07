-- Supabase exposes the public schema through PostgREST by default.
-- The application uses a server-side PostgreSQL connection through Prisma,
-- so no browser/API policies are required for these tables. Enabling RLS with
-- no public policies prevents anon/authenticated Data API access while the
-- database owner connection used by Prisma continues to operate normally.
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      table_record.tablename
    );
  END LOOP;
END
$$;
