
CREATE POLICY "Product videos are viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-videos');

CREATE POLICY "Admins upload product videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update product videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete product videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-videos' AND public.has_role(auth.uid(), 'admin'));
