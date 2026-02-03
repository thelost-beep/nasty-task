-- 1. Enable REPLICA IDENTITY FULL for real-time performance
-- This ensures that the 'before' and 'after' image of a row is sent with every change.
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE direct_messages REPLICA IDENTITY FULL;
ALTER TABLE conversations REPLICA IDENTITY FULL;

-- 2. Improve handle_new_user function for better profile creation
-- It will now try to extract a better name and username from OAuth metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_username TEXT;
    new_full_name TEXT;
    email_name TEXT;
BEGIN
    -- Try to get name from metadata
    new_full_name := COALESCE(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        new.raw_user_meta_data->>'given_name',
        'Anonymous User'
    );

    -- If name is still generic, use email prefix
    IF new_full_name = 'Anonymous User' AND new.email IS NOT NULL THEN
        email_name := split_part(new.email, '@', 1);
        new_full_name := initcap(replace(email_name, '.', ' '));
    END IF;

    -- Generate a sensible username
    new_username := COALESCE(
        new.raw_user_meta_data->>'username',
        new.raw_user_meta_data->>'preferred_username',
        'user_' || substr(new.id::text, 1, 8)
    );

    INSERT INTO public.profiles (
        user_id, 
        username, 
        full_name, 
        bio, 
        skills, 
        rating, 
        completed_tasks, 
        status
    )
    VALUES (
        new.id,
        new_username,
        new_full_name,
        '',
        '{}',
        0.00,
        0,
        'active'
    )
    ON CONFLICT (user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        username = EXCLUDED.username
    WHERE profiles.full_name = 'Anonymous User' OR profiles.full_name = 'Anonymous User';

    RETURN new;
END;
$$ LANGUAGE plpgsql;

-- 3. Ensure conversation timestamps are updated when a message is sent
-- This makes the "last message first" logic work perfectly.
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS trigger
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.conversations
    SET updated_at = now()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_direct_message_sent ON direct_messages;
CREATE TRIGGER on_direct_message_sent
    AFTER INSERT ON direct_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_conversation_timestamp();
