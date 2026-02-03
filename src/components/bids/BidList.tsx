import { useState, useEffect } from 'react';
import { Check, X, Clock, DollarSign, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface Bid {
    id: string;
    bidder_id: string;
    proposed_budget: number;
    proposed_deadline: string | null;
    message: string;
    status: string;
    created_at: string;
    bidder?: {
        id: string;
        full_name: string;
        username: string;
        skills: string[];
        rating: number;
    };
}

interface BidListProps {
    taskId: string;
    taskOwnerId: string;
    onBidAccepted?: () => void;
}

export function BidList({ taskId, taskOwnerId, onBidAccepted }: BidListProps) {
    const { profile } = useAuth();
    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const isOwner = profile?.id === taskOwnerId;

    useEffect(() => {
        fetchBids();

        // Subscribe to new bids
        const subscription = supabase
            .channel(`bids_${taskId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'bids', filter: `task_id=eq.${taskId}` },
                () => {
                    fetchBids();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [taskId]);

    const fetchBids = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('bids')
                .select(`
          *,
          bidder:profiles!bids_bidder_id_fkey(*)
        `)
                .eq('task_id', taskId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBids(data || []);
        } catch (error) {
            console.error('Error fetching bids:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptBid = async (bidId: string) => {
        if (!isOwner) return;

        setActionLoading(bidId);
        try {
            // Get the bid details first
            const { data: bid, error: bidError } = await supabase
                .from('bids')
                .select('bidder_id')
                .eq('id', bidId)
                .single();

            if (bidError) throw bidError;

            // Call the database function to atomically accept bid and update task
            const { error } = await supabase.rpc('accept_bid_and_update_task', {
                p_bid_id: bidId,
                p_bidder_id: bid.bidder_id
            });

            if (error) throw error;

            // Call callback to notify parent component
            onBidAccepted?.();
        } catch (error: any) {
            console.error('Error accepting bid:', error);
            alert(`Failed to accept bid: ${error.message || 'Unknown error'}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectBid = async (bidId: string) => {
        if (!isOwner) return;

        setActionLoading(bidId);
        try {
            const { error } = await supabase
                .from('bids')
                .update({ status: 'rejected' })
                .eq('id', bidId);

            if (error) throw error;
        } catch (error) {
            console.error('Error rejecting bid:', error);
            alert('Failed to reject bid');
        } finally {
            setActionLoading(null);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
        );
    }

    if (bids.length === 0) {
        return (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No bids yet</p>
                <p className="text-sm text-gray-500 mt-1">Be the first to place a bid!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare size={20} />
                Bids ({bids.length})
            </h3>

            {bids.map((bid) => (
                <div
                    key={bid.id}
                    className={`card p-5 ${bid.status === 'accepted'
                        ? 'border-2 border-green-500 bg-green-50'
                        : bid.status === 'rejected'
                            ? 'opacity-60'
                            : ''
                        }`}
                >
                    {/* Bidder Info */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-lg">
                                    {bid.bidder?.full_name?.charAt(0).toUpperCase() || '?'}
                                </span>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900">{bid.bidder?.full_name}</h4>
                                <p className="text-sm text-gray-500">@{bid.bidder?.username}</p>
                                {bid.bidder?.skills && bid.bidder.skills.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {bid.bidder.skills.slice(0, 3).map((skill) => (
                                            <span
                                                key={skill}
                                                className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status Badge */}
                        {bid.status !== 'pending' && (
                            <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${bid.status === 'accepted'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                    }`}
                            >
                                {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                            </span>
                        )}
                    </div>

                    {/* Bid Details */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-gray-700">
                            <DollarSign size={16} className="text-green-600" />
                            <div>
                                <p className="text-xs text-gray-500">Proposed Budget</p>
                                <p className="font-semibold">₹{bid.proposed_budget}</p>
                            </div>
                        </div>

                        {bid.proposed_deadline && (
                            <div className="flex items-center gap-2 text-gray-700">
                                <Clock size={16} className="text-blue-600" />
                                <div>
                                    <p className="text-xs text-gray-500">Deadline</p>
                                    <p className="font-semibold text-sm">{formatDate(bid.proposed_deadline)}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Message */}
                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{bid.message}</p>
                    </div>

                    {/* Actions */}
                    {isOwner && bid.status === 'pending' && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleAcceptBid(bid.id)}
                                disabled={actionLoading === bid.id}
                                className="btn-primary flex-1 text-sm"
                            >
                                {actionLoading === bid.id ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <>
                                        <Check size={16} className="mr-1" />
                                        Accept Bid
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => handleRejectBid(bid.id)}
                                disabled={actionLoading === bid.id}
                                className="btn-secondary flex-1 text-sm"
                            >
                                <X size={16} className="mr-1" />
                                Reject
                            </button>
                        </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-gray-400 mt-3">
                        Submitted {formatDate(bid.created_at)}
                    </p>
                </div>
            ))}
        </div>
    );
}
