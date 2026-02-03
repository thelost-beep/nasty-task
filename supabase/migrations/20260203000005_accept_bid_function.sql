-- Create database function for atomically accepting a bid and updating task
-- This ensures bid acceptance, task status change, and other bid rejections happen together

CREATE OR REPLACE FUNCTION accept_bid_and_update_task(
  p_bid_id UUID,
  p_bidder_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_id UUID;
  v_proposed_budget INTEGER;
  v_proposed_deadline TIMESTAMPTZ;
BEGIN
  -- Get task_id and bid details
  SELECT task_id, proposed_budget, proposed_deadline
  INTO v_task_id, v_proposed_budget, v_proposed_deadline
  FROM bids
  WHERE id = p_bid_id;

  IF v_task_id IS NULL THEN
    RAISE EXCEPTION 'Bid not found';
  END IF;

  -- Accept the bid
  UPDATE bids 
  SET status = 'accepted', updated_at = NOW()
  WHERE id = p_bid_id;

  -- Update task status and assignment
  UPDATE tasks
  SET 
    status = 'IN_PROGRESS',
    accepted_user_id = p_bidder_id,
    budget = v_proposed_budget,
    deadline = COALESCE(v_proposed_deadline, deadline),
    updated_at = NOW()
  WHERE id = v_task_id;

  -- Automatically reject all other pending bids for this task
  UPDATE bids
  SET status = 'rejected', updated_at = NOW()
  WHERE task_id = v_task_id
    AND id != p_bid_id
    AND status = 'pending';

  -- Create notification for accepted bidder (optional enhancement)
  INSERT INTO notifications (user_id, type, title, message, task_id)
  VALUES (
    p_bidder_id,
    'BID_ACCEPTED',
    'Your bid was accepted!',
    'Congratulations! Your bid has been accepted. Time to get to work!',
    v_task_id
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION accept_bid_and_update_task(UUID, UUID) TO authenticated;
