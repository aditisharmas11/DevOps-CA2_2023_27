
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_status_change() FROM PUBLIC, anon, authenticated;

-- Storage policies: public read, authenticated upload, owner-only delete
CREATE POLICY "Public read report photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'report-photos');
CREATE POLICY "Authenticated upload report photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'report-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners delete own report photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'report-photos' AND owner = auth.uid());
