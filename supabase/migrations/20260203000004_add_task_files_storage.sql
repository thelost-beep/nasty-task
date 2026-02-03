-- Create storage bucket for task files
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-files', 'task-files', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for task files
CREATE POLICY "Authenticated users can upload task files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'task-files' AND
    (storage.foldername(name))[1] = 'attachments'
  );

CREATE POLICY "Anyone can view task files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'task-files');

CREATE POLICY "Users can update their own task files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'task-files' AND
    (storage.foldername(name))[1] = 'attachments'
  );

CREATE POLICY "Users can delete their own task files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'task-files' AND
    (storage.foldername(name))[1] = 'attachments'
  );
