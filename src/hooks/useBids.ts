import { useState, useEffect, useCallback } from 'react';
import { supabase, Bid } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useBids(taskId?: string) {
    const { profile } = useAuth();
    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchBids = useCallback(async () => {
        if (!taskId) {
            setBids([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('bids')
                .select(`
          *,
          bidder:profiles!bids_bidder_id_fkey(*)
        `)
                .eq('task_id', taskId)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setBids(data || []);
        } catch (err) {
            console.error('Error fetching bids:', err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    useEffect(() => {
        fetchBids();

        // Subscribe to real-time updates
        if (taskId) {
            const subscription = supabase
                .channel(`bids_${taskId}`)
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'bids', filter: `task_id=eq.${taskId}` },
                    (payload) => {
                        if (payload.eventType === 'INSERT') {
                            setBids(prev => [payload.new as Bid, ...prev]);
                        } else if (payload.eventType === 'UPDATE') {
                            setBids(prev =>
                                prev.map(bid => bid.id === payload.new.id ? { ...bid, ...payload.new } : bid)
                            );
                        } else if (payload.eventType === 'DELETE') {
                            setBids(prev => prev.filter(bid => bid.id !== payload.old.id));
                        }
                    }
                )
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [taskId, fetchBids]);

    const submitBid = async (data: {
        proposed_budget: number;
        proposed_deadline?: string;
        message: string;
    }) => {
        if (!profile || !taskId) {
            return { data: null, error: new Error('Not authenticated or no task') };
        }

        try {
            const { data: newBid, error } = await supabase
                .from('bids')
                .insert({
                    task_id: taskId,
                    bidder_id: profile.id,
                    proposed_budget: data.proposed_budget,
                    proposed_deadline: data.proposed_deadline || null,
                    message: data.message,
                })
                .select(`
          *,
          bidder:profiles!bids_bidder_id_fkey(*)
        `)
                .single();

            if (error) throw error;
            return { data: newBid, error: null };
        } catch (err) {
            console.error('Error submitting bid:', err);
            return { data: null, error: err as Error };
        }
    };

    const acceptBid = async (bidId: string) => {
        try {
            const { data, error } = await supabase
                .from('bids')
                .update({ status: 'accepted', updated_at: new Date().toISOString() })
                .eq('id', bidId)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (err) {
            console.error('Error accepting bid:', err);
            return { data: null, error: err as Error };
        }
    };

    const rejectBid = async (bidId: string) => {
        try {
            const { data, error } = await supabase
                .from('bids')
                .update({ status: 'rejected', updated_at: new Date().toISOString() })
                .eq('id', bidId)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (err) {
            console.error('Error rejecting bid:', err);
            return { data: null, error: err as Error };
        }
    };

    const withdrawBid = async (bidId: string) => {
        try {
            const { error } = await supabase
                .from('bids')
                .delete()
                .eq('id', bidId);

            if (error) throw error;
            return { error: null };
        } catch (err) {
            console.error('Error withdrawing bid:', err);
            return { error: err as Error };
        }
    };

    const getMyBidForTask = () => {
        if (!profile) return null;
        return bids.find(bid => bid.bidder_id === profile.id && bid.status === 'pending');
    };

    return {
        bids,
        loading,
        error,
        submitBid,
        acceptBid,
        rejectBid,
        withdrawBid,
        getMyBidForTask,
        refreshBids: fetchBids,
    };
}
