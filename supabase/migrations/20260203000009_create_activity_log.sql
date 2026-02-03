-- Create activity type enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type') THEN
        CREATE TYPE activity_type AS ENUM (
            'task_posted',
            'task_accepted',
            'task_completed',
            'bid_placed',
            'rating_received',
            'task_liked'
        );
    END IF;
END $$;

-- Create activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type activity_type NOT NULL,
    task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
    related_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read all activity"
    ON activity_log FOR SELECT
    TO authenticated
    USING (true);

-- Triggers for logging activities

-- 1. Task Posted
CREATE OR REPLACE FUNCTION log_task_posted()
RETURNS trigger AS $$
BEGIN
    INSERT INTO activity_log (user_id, type, task_id)
    VALUES (NEW.owner_id, 'task_posted', NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER trigger_log_task_posted
    AFTER INSERT ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION log_task_posted();

-- 2. Task Accepted & Completed
CREATE OR REPLACE FUNCTION log_task_updates()
RETURNS trigger AS $$
BEGIN
    -- Task Accepted
    IF NEW.accepted_user_id IS NOT NULL AND OLD.accepted_user_id IS NULL THEN
        -- Log for owner
        INSERT INTO activity_log (user_id, type, task_id, related_user_id)
        VALUES (NEW.owner_id, 'task_accepted', NEW.id, NEW.accepted_user_id);
        
        -- Log for accepted user
        INSERT INTO activity_log (user_id, type, task_id, related_user_id)
        VALUES (NEW.accepted_user_id, 'task_accepted', NEW.id, NEW.owner_id);
    END IF;

    -- Task Completed
    IF NEW.status = 'DONE' AND OLD.status != 'DONE' THEN
        INSERT INTO activity_log (user_id, type, task_id, related_user_id)
        VALUES (NEW.owner_id, 'task_completed', NEW.id, NEW.accepted_user_id);
        
        INSERT INTO activity_log (user_id, type, task_id, related_user_id)
        VALUES (NEW.accepted_user_id, 'task_completed', NEW.id, NEW.owner_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER trigger_log_task_updates
    AFTER UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION log_task_updates();

-- 3. Bid Placed
CREATE OR REPLACE FUNCTION log_bid_placed()
RETURNS trigger AS $$
BEGIN
    INSERT INTO activity_log (user_id, type, task_id, metadata)
    VALUES (NEW.bidder_id, 'bid_placed', NEW.task_id, jsonb_build_object('amount', NEW.proposed_budget));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER trigger_log_bid_placed
    AFTER INSERT ON bids
    FOR EACH ROW
    EXECUTE FUNCTION log_bid_placed();

-- 4. Rating Received
CREATE OR REPLACE FUNCTION log_rating_received()
RETURNS trigger AS $$
BEGIN
    INSERT INTO activity_log (user_id, type, task_id, related_user_id, metadata)
    VALUES (NEW.to_user, 'rating_received', NEW.task_id, NEW.from_user, jsonb_build_object('stars', NEW.stars));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER trigger_log_rating_received
    AFTER INSERT ON ratings
    FOR EACH ROW
    EXECUTE FUNCTION log_rating_received();

-- 5. Task Liked
CREATE OR REPLACE FUNCTION log_task_liked()
RETURNS trigger AS $$
BEGIN
    INSERT INTO activity_log (user_id, type, task_id)
    VALUES (NEW.user_id, 'task_liked', NEW.task_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER trigger_log_task_liked
    AFTER INSERT ON likes
    FOR EACH ROW
    EXECUTE FUNCTION log_task_liked();
