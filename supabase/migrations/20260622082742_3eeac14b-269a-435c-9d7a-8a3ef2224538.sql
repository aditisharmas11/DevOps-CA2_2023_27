
-- =========================================================
-- REPORTS: hide reporter identity from the public
-- =========================================================
DROP POLICY IF EXISTS "Reports publicly viewable" ON public.reports;

CREATE POLICY "Reporter views own reports"
  ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Staff view all reports"
  ON public.reports FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin')
    OR private.has_role(auth.uid(), 'authority')
  );

-- Public-safe view: excludes reporter_id, reviewed_by, resolution_note author info
CREATE OR REPLACE VIEW public.reports_public AS
SELECT
  id, title, description, category, severity, status,
  latitude, longitude, address, province, city,
  resolution_note, reviewed_at,
  created_at, updated_at
FROM public.reports;

ALTER VIEW public.reports_public SET (security_invoker = off);
GRANT SELECT ON public.reports_public TO anon, authenticated;

-- =========================================================
-- REPORT_STATUS_HISTORY: hide staff identity from the public
-- =========================================================
DROP POLICY IF EXISTS "History viewable by all" ON public.report_status_history;

CREATE POLICY "Reporter views own report history"
  ON public.report_status_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_status_history.report_id
        AND r.reporter_id = auth.uid()
    )
  );

CREATE POLICY "Staff view all history"
  ON public.report_status_history FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin')
    OR private.has_role(auth.uid(), 'authority')
  );

-- Tighten INSERT: cannot attribute changes to another user
DROP POLICY IF EXISTS "Authorities insert history" ON public.report_status_history;
CREATE POLICY "Authorities insert history"
  ON public.report_status_history FOR INSERT TO authenticated
  WITH CHECK (
    (changed_by IS NULL OR changed_by = auth.uid())
    AND (
      private.has_role(auth.uid(), 'authority')
      OR private.has_role(auth.uid(), 'admin')
    )
  );

-- Public-safe view: excludes changed_by
CREATE OR REPLACE VIEW public.report_status_history_public AS
SELECT
  id, report_id, old_status, new_status, note, created_at
FROM public.report_status_history;

ALTER VIEW public.report_status_history_public SET (security_invoker = off);
GRANT SELECT ON public.report_status_history_public TO anon, authenticated;

-- =========================================================
-- STORAGE: remove public SELECT on report-photos
-- Signed URLs are now issued by a server endpoint using the admin key.
-- =========================================================
DROP POLICY IF EXISTS "Public read report photos" ON storage.objects;
