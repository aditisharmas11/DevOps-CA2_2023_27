
-- ===== 1. report_images: drop public column + lock SELECT =====
DROP POLICY IF EXISTS "Images publicly viewable" ON public.report_images;
ALTER TABLE public.report_images DROP COLUMN IF EXISTS image_url;

REVOKE SELECT ON public.report_images FROM anon;

CREATE POLICY "Owner views own report images"
  ON public.report_images FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_images.report_id AND r.reporter_id = auth.uid()));

CREATE POLICY "Admins/authorities view all report images"
  ON public.report_images FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'authority'));

-- ===== 2. reports: lock public SELECT, add restricted policies =====
DROP POLICY IF EXISTS "Reports viewable by everyone" ON public.reports;
REVOKE SELECT ON public.reports FROM anon;

CREATE POLICY "Owner views own reports"
  ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins/authorities view all reports"
  ON public.reports FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'authority'));

-- ===== 3. Public view exposing only safe columns + approximate coords =====
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
  -- ~11km precision: hides exact GPS
  round(latitude::numeric, 1)::double precision  AS latitude_approx,
  round(longitude::numeric, 1)::double precision AS longitude_approx,
  created_at
FROM public.reports;

GRANT SELECT ON public.reports_public TO anon, authenticated;

-- ===== 4. report_status_history: lock public SELECT =====
DROP POLICY IF EXISTS "History viewable by everyone" ON public.report_status_history;
REVOKE SELECT ON public.report_status_history FROM anon;

CREATE POLICY "Owner views own report history"
  ON public.report_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_status_history.report_id AND r.reporter_id = auth.uid()));

CREATE POLICY "Admins/authorities view all history"
  ON public.report_status_history FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'authority'));
