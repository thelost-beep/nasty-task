import { Star, Check, X, Clock, DollarSign, Calendar, User } from 'lucide-react';
import { Bid } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useBids } from '../../hooks/useBids';

interface BidCardProps {
    bid: Bid;
    isTaskOwner: boolean;
    onAccept?: () => void;
    onReject?: () => void;
    onMessage?: () => void;
}

export function BidCard({ bid, isTaskOwner, onAccept, onReject, onMessage }: BidCardProps) {
    const { profile } = useAuth();
    const { acceptBid, rejectBid, withdrawBid } = useBids(bid.task_id);

    const isMyBid = profile?.id === bid.bidder_id;
    const isPending = bid.status === 'pending';

    const handleAccept = async () => {
        await acceptBid(bid.id);
        onAccept?.();
    };

    const handleReject = async () => {
        await rejectBid(bid.id);
        onReject?.();
    };

    const handleWithdraw = async () => {
        await withdrawBid(bid.id);
    };

    const getStatusBadge = () => {
        switch (bid.status) {
            case 'pending':
                return <span className="badge bg-yellow-100 text-yellow-800"><Clock size={14} /> Pending</span>;
            case 'accepted':
                return <span className="badge bg-green-100 text-green-800"><Check size={14} /> Accepted</span>;
            case 'rejected':
                return <span className="badge bg-red-100 text-red-800"><X size={14} /> Rejected</span>;
            case 'withdrawn':
                return <span className="badge bg-gray-100 text-gray-800">Withdrawn</span>;
            default:
                return null;
        }
    };

    const timeFromNow = (date: string) => {
        const now = Date.now();
        const then = new Date(date).getTime();
        const diff = now - then;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor(diff / (1000 * 60));

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    };

    return (
        <div className={`card p-5 animate-fade-in ${bid.status === 'accepted' ? 'border-green-300 bg-green-50/50' : ''}`}>
            <div className="flex items-start gap-4">
                {/* Bidder Avatar */}
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-lg">
                        {bid.bidder?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                </div>

                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                                {bid.bidder?.full_name || 'Unknown User'}
                            </span>
                            {bid.bidder?.rating && bid.bidder.rating > 0 && (
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                    <span>{bid.bidder.rating.toFixed(1)}</span>
                                </div>
                            )}
                        </div>
                        {getStatusBadge()}
                    </div>

                    {/* Budget & Deadline */}
                    <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-1 text-green-600 font-semibold">
                            <DollarSign size={16} />
                            <span>₹{bid.proposed_budget}</span>
                        </div>
                        {bid.proposed_deadline && (
                            <div className="flex items-center gap-1 text-gray-600 text-sm">
                                <Calendar size={14} />
                                <span>{new Date(bid.proposed_deadline).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>

                    {/* Message */}
                    <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">
                        {bid.message}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                            {timeFromNow(bid.created_at)}
                        </span>

                        <div className="flex items-center gap-2">
                            {/* Task owner actions */}
                            {isTaskOwner && isPending && (
                                <>
                                    <button
                                        onClick={onMessage}
                                        className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        Message
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        Decline
                                    </button>
                                    <button
                                        onClick={handleAccept}
                                        className="btn-primary text-sm py-1.5"
                                    >
                                        Accept
                                    </button>
                                </>
                            )}

                            {/* Bidder actions */}
                            {isMyBid && isPending && (
                                <button
                                    onClick={handleWithdraw}
                                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    Withdraw Bid
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
