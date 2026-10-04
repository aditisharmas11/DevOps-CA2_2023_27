
-- Sanitized fetcher in private schema (not exposed via PostgREST)
CREATE OR REPLACE FUNCTION private.list_public_reports()
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  category public.report_category,
  severity public.report_severity,
  status public.report_status,
  province text,
  city text,
  latitude_approx double precision,
  longitude_approx double precision,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id, r.title, r.description, r.category, r.severity, r.status,
    r.province, r.city,
    round(r.latitude::numeric, 1)::double precision,
    round(r.longitude::numeric, 1)::double precision,
    r.created_at
  FROM public.reports r
$$;

REVOKE ALL ON FUNCTION private.list_public_reports() FROM PUBLIC, anon, authenticated;

DROP VIEW IF EXISTS public.reports_public;
CREATE VIEW public.reports_public
WITH (security_invoker = on) AS
SELECT * FROM private.list_public_reports();

GRANT SELECT ON public.reports_public TO anon, authenticated;
