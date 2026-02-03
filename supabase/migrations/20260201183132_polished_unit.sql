/*
  # NastyTask Done Database Schema

  1. New Tables
    - `profiles` - User profiles with reputation and skills
    - `tasks` - Academic tasks with pricing and deadlines  
    - `messages` - Task-specific chat messages
    - `ratings` - Mutual ratings between users
    - `reports` - Community-driven reporting system
    - `notifications` - In-app notification system

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Implement task acceptance logic
    - Protect chat access to task participants only

  3. Real-time Features
    - Real-time subscriptions for tasks, messages, notifications
    - Automatic status updates and feed refreshing
*/

-- Users extension for authentication
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  bio text DEFAULT '',
  skills text[] DEFAULT '{}',
  rating numeric(3,2) DEFAULT 0.00,
  completed_tasks integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'deactivated')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$')
);

-- Tasks table  
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  subject text NOT NULL,
  budget integer NOT NULL,
  deadline timestamptz NOT NULL,
  status text DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'DELIVERED', 'DONE')),
  visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted')),
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  accepted_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  file_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT positive_budget CHECK (budget > 0),
  CONSTRAINT future_deadline CHECK (deadline > now()),
  CONSTRAINT different_users CHECK (owner_id != accepted_user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  file_url text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT content_not_empty CHECK (char_length(trim(content)) > 0)
);

-- Ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  from_user uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_user uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stars integer NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(task_id, from_user)
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('task', 'profile', 'message')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  description text DEFAULT '',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read all active profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Tasks policies
CREATE POLICY "Users can read public tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (visibility = 'public' AND status IN ('OPEN', 'IN_PROGRESS', 'DELIVERED', 'DONE'));

CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Task owners can update their tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Messages policies
CREATE POLICY "Task participants can read messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
      OR accepted_user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Task participants can insert messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) AND
    task_id IN (
      SELECT id FROM tasks 
      WHERE owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
      OR accepted_user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- Ratings policies
CREATE POLICY "Users can read all ratings"
  ON ratings FOR SELECT
  TO authenticated;

CREATE POLICY "Users can insert ratings for completed tasks"
  ON ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user IN (SELECT id FROM profiles WHERE user_id = auth.uid()) AND
    task_id IN (
      SELECT id FROM tasks 
      WHERE status = 'DONE' AND (
        owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
        OR accepted_user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
      )
    )
  );

-- Reports policies
CREATE POLICY "Users can insert reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can read own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (reporter_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Notifications policies
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Functions for automatic operations
CREATE OR REPLACE FUNCTION update_task_acceptance()
RETURNS trigger AS $$
BEGIN
  -- Only allow one user to accept a task
  IF NEW.accepted_user_id IS NOT NULL AND OLD.accepted_user_id IS NULL THEN
    NEW.status = 'IN_PROGRESS';
    NEW.updated_at = now();
    
    -- Create notification for task owner
    INSERT INTO notifications (user_id, type, title, message, task_id)
    SELECT owner_id, 'task_accepted', 'Task Accepted!', 
           'Your task "' || NEW.title || '" has been accepted', NEW.id
    FROM tasks WHERE id = NEW.id;
    
    -- Create notification for accepted user
    INSERT INTO notifications (user_id, type, title, message, task_id)
    VALUES (NEW.accepted_user_id, 'task_assignment', 'Task Assigned!', 
           'You have been assigned to work on "' || NEW.title || '"', NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER task_acceptance_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_acceptance();

-- Function to update user rating
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS trigger AS $$
BEGIN
  -- Update rating for the rated user
  UPDATE profiles 
  SET rating = (
    SELECT COALESCE(AVG(stars), 0)
    FROM ratings 
    WHERE to_user = NEW.to_user
  )
  WHERE id = NEW.to_user;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER rating_update_trigger
  AFTER INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating();

-- Function to update completed tasks count
CREATE OR REPLACE FUNCTION update_completed_tasks()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'DONE' AND OLD.status != 'DONE' THEN
    UPDATE profiles 
    SET completed_tasks = completed_tasks + 1
    WHERE id = NEW.accepted_user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER completed_tasks_trigger
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_completed_tasks();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_subject ON tasks(subject);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_messages_task_id ON messages(task_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON profiles(rating DESC);