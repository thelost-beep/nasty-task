/*
  # NastyTask Done - Complete System Fixes & Enhancements
  
  This migration fixes all broken features and adds new functionality:
  
  ## Fixes:
  1. Task acceptance now works properly with correct RLS policies
  2. Notifications are created when tasks are accepted
  3. Users can update tasks they've been assigned to
  
  ## New Features:
  1. Bidding/Quotation system
  2. Comments on tasks
  3. Direct messaging between users
  4. Enhanced notifications
*/

-- ===========================================
-- PART 1: FIX EXISTING POLICIES
-- ===========================================

-- Drop restrictive task update policy and create a proper one
DROP POLICY IF EXISTS "Task owners can update their tasks" ON tasks;

-- Allow task owners to update their tasks
CREATE POLICY "Task owners can update their tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Allow ANY authenticated user to accept OPEN tasks (this is the key fix!)
CREATE POLICY "Users can accept open tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    status = 'OPEN' AND 
    owner_id NOT IN (SELECT id FROM profiles WHERE user_id = auth.uid()) -- Not owner
  )
  WITH CHECK (
    accepted_user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Allow accepted users to update task status
CREATE POLICY "Accepted users can update task status"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    accepted_user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Allow users to read their own tasks (posted or accepted)
CREATE POLICY "Users can read own tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    accepted_user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Fix notifications - allow inserts (this was the missing policy!)
CREATE POLICY "Allow notification inserts"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Also allow the trigger function to insert by setting security definer
-- We need to recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_task_acceptance()
RETURNS trigger 
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow one user to accept a task
  IF NEW.accepted_user_id IS NOT NULL AND OLD.accepted_user_id IS NULL THEN
    NEW.status = 'IN_PROGRESS';
    NEW.updated_at = now();
    
    -- Create notification for task owner
    INSERT INTO notifications (user_id, type, title, message, task_id)
    VALUES (
      OLD.owner_id, 
      'task_accepted', 
      'Task Accepted!', 
      'Your task "' || NEW.title || '" has been accepted by someone',
      NEW.id
    );
    
    -- Create notification for accepted user
    INSERT INTO notifications (user_id, type, title, message, task_id)
    VALUES (
      NEW.accepted_user_id, 
      'task_assignment', 
      'Task Assigned!', 
      'You are now working on "' || NEW.title || '"',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- PART 2: BIDDING/QUOTATION SYSTEM
-- ===========================================

CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  bidder_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  proposed_budget DECIMAL(10, 2) NOT NULL,
  proposed_deadline TIMESTAMPTZ,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT positive_budget CHECK (proposed_budget > 0)
);

-- Create unique constraint to prevent multiple bids from same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_bid_per_user ON bids(task_id, bidder_id) WHERE status = 'pending';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bids_task ON bids(task_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder ON bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);

-- Trigger to prevent task owner from bidding on their own task
CREATE OR REPLACE FUNCTION validate_bid_not_owner()
RETURNS trigger
SECURITY DEFINER
AS $$
DECLARE
  task_owner UUID;
BEGIN
  SELECT owner_id INTO task_owner FROM tasks WHERE id = NEW.task_id;
  
  IF task_owner = NEW.bidder_id THEN
    RAISE EXCEPTION 'Task owner cannot bid on their own task';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER check_bid_not_owner
  BEFORE INSERT ON bids
  FOR EACH ROW
  EXECUTE FUNCTION validate_bid_not_owner();

-- Enable RLS
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- Policies for bids
CREATE POLICY "Users can view bids on their own tasks"
  ON bids FOR SELECT
  TO authenticated
  USING (
    task_id IN (SELECT id FROM tasks WHERE owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
    OR bidder_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create bids"
  ON bids FOR INSERT
  TO authenticated
  WITH CHECK (
    bidder_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) AND
    task_id IN (SELECT id FROM tasks WHERE status = 'OPEN')
  );

CREATE POLICY "Users can update own bids"
  ON bids FOR UPDATE
  TO authenticated
  USING (bidder_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Task owners can update bid status"
  ON bids FOR UPDATE
  TO authenticated
  USING (
    task_id IN (SELECT id FROM tasks WHERE owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can delete own pending bids"
  ON bids FOR DELETE
  TO authenticated
  USING (
    bidder_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) AND
    status = 'pending'
  );

-- Function to create notification when bid is submitted
CREATE OR REPLACE FUNCTION notify_new_bid()
RETURNS trigger
SECURITY DEFINER
AS $$
DECLARE
  task_owner_id UUID;
  task_title TEXT;
  bidder_name TEXT;
BEGIN
  -- Get task details
  SELECT owner_id, title INTO task_owner_id, task_title
  FROM tasks WHERE id = NEW.task_id;
  
  -- Get bidder name
  SELECT full_name INTO bidder_name
  FROM profiles WHERE id = NEW.bidder_id;
  
  -- Notify task owner
  INSERT INTO notifications (user_id, type, title, message, task_id)
  VALUES (
    task_owner_id,
    'new_bid',
    'New Quotation Received!',
    bidder_name || ' submitted a quotation of ₹' || NEW.proposed_budget || ' for "' || task_title || '"',
    NEW.task_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER bid_notification_trigger
  AFTER INSERT ON bids
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_bid();

-- Function to handle bid acceptance
CREATE OR REPLACE FUNCTION handle_bid_acceptance()
RETURNS trigger
SECURITY DEFINER
AS $$
DECLARE
  task_title TEXT;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Get task title
    SELECT title INTO task_title FROM tasks WHERE id = NEW.task_id;
    
    -- Update the task with the accepted bidder
    UPDATE tasks 
    SET accepted_user_id = NEW.bidder_id,
        status = 'IN_PROGRESS',
        budget = NEW.proposed_budget,
        deadline = COALESCE(NEW.proposed_deadline, deadline),
        updated_at = now()
    WHERE id = NEW.task_id;
    
    -- Reject all other pending bids for this task
    UPDATE bids 
    SET status = 'rejected', updated_at = now()
    WHERE task_id = NEW.task_id AND id != NEW.id AND status = 'pending';
    
    -- Notify the winning bidder
    INSERT INTO notifications (user_id, type, title, message, task_id)
    VALUES (
      NEW.bidder_id,
      'bid_accepted',
      'Your Quotation was Accepted!',
      'Congratulations! Your quotation for "' || task_title || '" has been accepted.',
      NEW.task_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER bid_acceptance_trigger
  AFTER UPDATE ON bids
  FOR EACH ROW
  EXECUTE FUNCTION handle_bid_acceptance();

-- ===========================================
-- PART 3: COMMENTS SYSTEM
-- ===========================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT content_not_empty CHECK (char_length(trim(content)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Everyone can read comments on public tasks
CREATE POLICY "Users can read comments"
  ON comments FOR SELECT
  TO authenticated
  USING (
    task_id IN (SELECT id FROM tasks WHERE visibility = 'public')
  );

-- Users can create comments
CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Function to notify on new comments
CREATE OR REPLACE FUNCTION notify_new_comment()
RETURNS trigger
SECURITY DEFINER
AS $$
DECLARE
  task_owner_id UUID;
  task_title TEXT;
  commenter_name TEXT;
BEGIN
  -- Get task details
  SELECT owner_id, title INTO task_owner_id, task_title
  FROM tasks WHERE id = NEW.task_id;
  
  -- Get commenter name
  SELECT full_name INTO commenter_name
  FROM profiles WHERE id = NEW.user_id;
  
  -- Don't notify if user is commenting on their own task
  IF NEW.user_id != task_owner_id THEN
    INSERT INTO notifications (user_id, type, title, message, task_id)
    VALUES (
      task_owner_id,
      'new_comment',
      'New Comment',
      commenter_name || ' commented on "' || task_title || '"',
      NEW.task_id
    );
  END IF;
  
  -- If this is a reply, notify the parent commenter
  IF NEW.parent_id IS NOT NULL THEN
    DECLARE
      parent_user_id UUID;
    BEGIN
      SELECT user_id INTO parent_user_id FROM comments WHERE id = NEW.parent_id;
      
      IF parent_user_id != NEW.user_id THEN
        INSERT INTO notifications (user_id, type, title, message, task_id)
        VALUES (
          parent_user_id,
          'comment_reply',
          'New Reply',
          commenter_name || ' replied to your comment',
          NEW.task_id
        );
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER comment_notification_trigger
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_comment();

-- ===========================================
-- PART 4: DIRECT MESSAGING SYSTEM
-- ===========================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_read_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT dm_content_not_empty CHECK (char_length(trim(content)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_dm_conversation ON direct_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_dm_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_created ON direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Participants policies
CREATE POLICY "Users can view participants of their conversations"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can add themselves to conversations"
  ON conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their participant record"
  ON conversation_participants FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Direct messages policies
CREATE POLICY "Users can view messages in their conversations"
  ON direct_messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages to their conversations"
  ON direct_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) AND
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- Function to get or create conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(user1_id UUID, user2_id UUID, related_task_id UUID DEFAULT NULL)
RETURNS UUID
SECURITY DEFINER
AS $$
DECLARE
  conv_id UUID;
BEGIN
  -- Check if conversation already exists
  SELECT cp1.conversation_id INTO conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = user1_id AND cp2.user_id = user2_id
  LIMIT 1;
  
  IF conv_id IS NULL THEN
    -- Create new conversation
    INSERT INTO conversations (task_id) VALUES (related_task_id) RETURNING id INTO conv_id;
    
    -- Add participants
    INSERT INTO conversation_participants (conversation_id, user_id) VALUES (conv_id, user1_id);
    INSERT INTO conversation_participants (conversation_id, user_id) VALUES (conv_id, user2_id);
  END IF;
  
  RETURN conv_id;
END;
$$ LANGUAGE plpgsql;

-- Function to notify on new DM
CREATE OR REPLACE FUNCTION notify_new_dm()
RETURNS trigger
SECURITY DEFINER
AS $$
DECLARE
  sender_name TEXT;
  recipient_id UUID;
BEGIN
  -- Get sender name
  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
  
  -- Get recipient (the other participant)
  SELECT user_id INTO recipient_id
  FROM conversation_participants
  WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id
  LIMIT 1;
  
  IF recipient_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, task_id)
    VALUES (
      recipient_id,
      'new_message',
      'New Message',
      sender_name || ' sent you a message',
      NULL
    );
  END IF;
  
  -- Update conversation timestamp
  UPDATE conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER dm_notification_trigger
  AFTER INSERT ON direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_dm();

-- ===========================================
-- PART 5: ENHANCE NOTIFICATIONS TABLE
-- ===========================================

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_user_id UUID REFERENCES profiles(id);

-- Enable real-time for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE bids;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
