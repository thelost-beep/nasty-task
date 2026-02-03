-- Rename columns if they exist from a previous migration
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ratings' AND column_name = 'from_user') THEN
    ALTER TABLE ratings RENAME COLUMN from_user TO from_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ratings' AND column_name = 'to_user') THEN
    ALTER TABLE ratings RENAME COLUMN to_user TO to_user_id;
  END IF;
END $$;

-- Create ratings table if it doesn't exist (it should exist now, but good for safety)
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stars INTEGER CHECK (stars >= 1 AND stars <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index
DROP INDEX IF EXISTS idx_ratings_to_user;
DROP INDEX IF EXISTS idx_ratings_task;
CREATE INDEX IF NOT EXISTS idx_ratings_to_user ON ratings(to_user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_from_user ON ratings(from_user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_task ON ratings(task_id);

-- RLS
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ratings are public" ON ratings;
CREATE POLICY "Ratings are public"
  ON ratings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert ratings as involved parties" ON ratings;
DROP POLICY IF EXISTS "Users can insert ratings for completed tasks" ON ratings;
CREATE POLICY "Users can insert ratings as involved parties"
  ON ratings FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM profiles WHERE id = from_user_id) AND
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE id = task_id AND (owner_id = from_user_id OR accepted_user_id = from_user_id)
    )
  );

-- Function to update user rating average
-- Drop old function/trigger names if they exist from polished_unit
DROP TRIGGER IF EXISTS rating_update_trigger ON ratings;
DROP TRIGGER IF EXISTS on_rating_insert ON ratings;

CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET 
    rating = (SELECT COALESCE(AVG(stars), 0) FROM ratings WHERE to_user_id = NEW.to_user_id),
    completed_tasks = (
      SELECT COUNT(*) FROM tasks 
      WHERE (owner_id = NEW.to_user_id OR accepted_user_id = NEW.to_user_id) 
      AND status = 'DONE'
    )
  WHERE id = NEW.to_user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update rating on new rating insert
CREATE TRIGGER on_rating_insert
  AFTER INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating();
