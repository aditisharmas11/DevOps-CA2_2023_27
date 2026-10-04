
CREATE POLICY "Owners read own report photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'report-photos' AND owner = auth.uid());

CREATE POLICY "Owners update own report photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'report-photos' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'report-photos' AND owner = auth.uid());
