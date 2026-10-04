
-- Fix public view permissions: allow anon to read through the view
-- security_invoker=off runs the underlying query as the view owner,
-- so callers don't need EXECUTE on the backing function.

DROP VIEW IF EXISTS public.reports_public;
CREATE VIEW public.reports_public
WITH (security_invoker = off) AS
SELECT
  id,
  title,
  description,
  category,
  severity,
  status,
  province,
  city,
  round(latitude::numeric, 1)::double precision  AS latitude_approx,
  round(longitude::numeric, 1)::double precision AS longitude_approx,
  created_at
FROM public.reports;

GRANT SELECT ON public.reports_public TO anon, authenticated;
