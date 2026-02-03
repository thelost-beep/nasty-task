-- Fix Task Deletion and Profile Visibility RLS Issues

-- 1. Allow owners to delete their own tasks
CREATE POLICY "Task owners can delete their tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- 2. Allow users to update their own profile regardless of status
-- (The existing update policy is already restricted by user_id = auth.uid(), which is correct)
-- However, the SELECT policy might be too restrictive if it only allows 'active' status
-- Let's update the SELECT policy to allow users to ALWAYS see their own profile.

DROP POLICY IF EXISTS "Users can read all active profiles" ON profiles;

CREATE POLICY "Users can read all active profiles or own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (status = 'active' OR user_id = auth.uid());

-- 3. Ensure task_attachments have proper delete policy (matches tasks owner)
DROP POLICY IF EXISTS "Users can delete attachments of their own tasks" ON task_attachments;

CREATE POLICY "Users can delete attachments of their own tasks"
  ON task_attachments FOR DELETE
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );
