-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, full_name, bio, skills, rating, completed_tasks, status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    COALESCE(new.raw_user_meta_data->>'full_name', 'Anonymous User'),
    '',
    '{}',
    0.00,
    0,
    'active'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS for public visibility (reading active profiles)
-- This allows anyone (including anonymous users if enabled in Supabase) 
-- to view active profiles, which is essential for a social platform.
DROP POLICY IF EXISTS "Users can read all active profiles or own profile" ON profiles;
CREATE POLICY "Anyone can read active profiles"
  ON profiles FOR SELECT
  USING (status = 'active' OR (auth.uid() IS NOT NULL AND user_id = auth.uid()));

-- Ensure users can always update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
