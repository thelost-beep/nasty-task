-- Final RLS fix for activity_log
-- This ensures that the insertions from triggers don't collide with RLS restrictions.

-- 1. Add a policy to allow authenticated users to insert into activity_log
-- We use WITH CHECK (true) because the triggers handle the logic, 
-- and we want to ensure no RLS failure blocks the main transaction (like posting a task).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'activity_log' 
        AND policyname = 'Users can insert activity'
    ) THEN
        CREATE POLICY "Users can insert activity" 
        ON activity_log FOR INSERT 
        TO authenticated 
        WITH CHECK (true);
    END IF;
END $$;

-- 2. Re-verify functions are SECURITY DEFINER (just in case)
ALTER FUNCTION log_task_posted() SECURITY DEFINER;
ALTER FUNCTION log_task_updates() SECURITY DEFINER;
ALTER FUNCTION log_bid_placed() SECURITY DEFINER;
ALTER FUNCTION log_rating_received() SECURITY DEFINER;
ALTER FUNCTION log_task_liked() SECURITY DEFINER;

-- 3. Ensure the search_path is secure for these functions
ALTER FUNCTION log_task_posted() SET search_path = public;
ALTER FUNCTION log_task_updates() SET search_path = public;
ALTER FUNCTION log_bid_placed() SET search_path = public;
ALTER FUNCTION log_rating_received() SET search_path = public;
ALTER FUNCTION log_task_liked() SET search_path = public;
