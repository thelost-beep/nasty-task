-- Enable Realtime for specific tables if not already enabled
-- This script safely adds tables to the supabase_realtime publication only if they aren't already members.

DO $$
DECLARE
    table_names text[] := ARRAY['messages', 'direct_messages', 'conversations', 'conversation_participants', 'activity_log'];
    tname text;
BEGIN
    -- Ensure the publication exists
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    -- Add tables one by one if they are not already members
    FOREACH tname IN ARRAY table_names
    LOOP
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = tname
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tname);
        END IF;
    END LOOP;
END $$;
