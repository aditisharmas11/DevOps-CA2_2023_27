
-- Remove the security-definer views flagged by the linter
DROP VIEW IF EXISTS public.reports_public;
DROP VIEW IF EXISTS public.report_status_history_public;

-- ---------- REPORTS ----------
DROP POLICY IF EXISTS "Reporter views own reports" ON public.reports;
DROP POLICY IF EXISTS "Staff view all reports" ON public.reports;

CREATE POLICY "Reports viewable by everyone"
  ON public.reports FOR SELECT
  TO anon, authenticated
  USING (true);

-- Column-level grants: hide reporter_id and reviewed_by from public clients
REVOKE SELECT ON public.reports FROM anon, authenticated;
GRANT SELECT (
  id, title, description, category, severity, status,
  latitude, longitude, address, province, city,
  resolution_note, reviewed_at, created_at, updated_at
) ON public.reports TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reports TO authenticated;

-- ---------- REPORT_STATUS_HISTORY ----------
DROP POLICY IF EXISTS "Reporter views own report history" ON public.report_status_history;
DROP POLICY IF EXISTS "Staff view all history" ON public.report_status_history;

CREATE POLICY "History viewable by everyone"
  ON public.report_status_history FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE SELECT ON public.report_status_history FROM anon, authenticated;
GRANT SELECT (
  id, report_id, old_status, new_status, note, created_at
) ON public.report_status_history TO anon, authenticated;
GRANT INSERT ON public.report_status_history TO authenticated;

-- ---------- RPCs for privileged reads ----------
CREATE OR REPLACE FUNCTION public.get_my_reports()
RETURNS SETOF public.reports
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.reports
   WHERE reporter_id = auth.uid()
   ORDER BY created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_my_reports() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_reports() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_reports()
RETURNS SETOF public.reports
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    private.has_role(auth.uid(), 'admin')
    OR private.has_role(auth.uid(), 'authority')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.reports ORDER BY created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_reports() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_reports() TO authenticated;
