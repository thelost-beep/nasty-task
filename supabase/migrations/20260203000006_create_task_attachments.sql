-- Create task_attachments table for multiple file uploads
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_name TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);

-- Enable RLS
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read access for task attachments"
  ON task_attachments FOR SELECT
  USING (true);

CREATE POLICY "Users can upload attachments for their own tasks"
  ON task_attachments FOR INSERT
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attachments of their own tasks"
  ON task_attachments FOR DELETE
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE owner_id = auth.uid()
    )
  );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE task_attachments;

-- Create Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('task_attachments', 'task_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'task_attachments' );

create policy "Authenticated Upload"
  on storage.objects for insert
  with check ( bucket_id = 'task_attachments' and auth.role() = 'authenticated' );

create policy "Users can delete own files"
  on storage.objects for delete
  using ( bucket_id = 'task_attachments' and auth.uid() = owner );
