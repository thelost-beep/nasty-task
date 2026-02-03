import { useState } from 'react';
import { X, DollarSign, Calendar, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface BidModalProps {
    isOpen: boolean;
    onClose: () => void;
    taskId: string;
    taskTitle: string;
    taskBudget?: number;
    onBidSubmitted?: () => void;
}

export function BidModal({
    isOpen,
    onClose,
    taskId,
    taskTitle,
    taskBudget,
    onBidSubmitted,
}: BidModalProps) {
    const { profile } = useAuth();
    const [proposedBudget, setProposedBudget] = useState(taskBudget?.toString() || '');
    const [proposedDeadline, setProposedDeadline] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        setLoading(true);
        setError('');

        try {
            const budget = parseFloat(proposedBudget);
            if (isNaN(budget) || budget <= 0) {
                throw new Error('Please enter a valid budget amount');
            }

            const { error: bidError } = await supabase.from('bids').insert({
                task_id: taskId,
                bidder_id: profile.id,
                proposed_budget: budget,
                proposed_deadline: proposedDeadline || null,
                message: message.trim(),
            });

            if (bidError) throw bidError;

            onBidSubmitted?.();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to submit bid');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Place Your Bid</h2>
                            <p className="text-sm text-gray-600 mt-1">{taskTitle}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Proposed Budget */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <DollarSign size={16} className="inline mr-2" />
                                Your Proposed Budget (₹)
                            </label>
                            <input
                                type="number"
                                required
                                min="1"
                                step="0.01"
                                value={proposedBudget}
                                onChange={(e) => setProposedBudget(e.target.value)}
                                className="input w-full"
                                placeholder="Enter your price"
                            />
                            {taskBudget && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Original budget: ₹{taskBudget}
                                </p>
                            )}
                        </div>

                        {/* Proposed Deadline */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Calendar size={16} className="inline mr-2" />
                                Proposed Deadline (Optional)
                            </label>
                            <input
                                type="datetime-local"
                                value={proposedDeadline}
                                onChange={(e) => setProposedDeadline(e.target.value)}
                                className="input w-full"
                            />
                        </div>

                        {/* Message */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <MessageSquare size={16} className="inline mr-2" />
                                Pitch Your Proposal
                            </label>
                            <textarea
                                required
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="input w-full"
                                rows={4}
                                placeholder="Explain why you're the best fit for this task..."
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Highlight your skills and experience relevant to this task
                            </p>
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-secondary flex-1"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary flex-1"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin mr-2" />
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Bid'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
