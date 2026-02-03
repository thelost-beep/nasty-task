-- Add verification and admin fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Create a policy for admins to update profiles (including verification status)
-- Note: We check if the current user's profile has is_admin = true
CREATE POLICY "Admins can update any profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND is_admin = true
        )
    );

-- Set the first registered user or a specific user as admin (optional but helpful)
-- UPDATE profiles SET is_admin = true WHERE username = 'aftab'; -- Replace 'aftab' if needed
