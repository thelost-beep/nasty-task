import { useState } from 'react';
import { DollarSign, Calendar, Send, X } from 'lucide-react';
import { useBids } from '../../hooks/useBids';

interface BidFormProps {
    taskId: string;
    currentBudget: number;
    deadline: string;
    onClose: () => void;
    onSuccess?: () => void;
}

export function BidForm({ taskId, currentBudget, deadline, onClose, onSuccess }: BidFormProps) {
    const { submitBid, getMyBidForTask } = useBids(taskId);
    const [proposedBudget, setProposedBudget] = useState(currentBudget.toString());
    const [proposedDeadline, setProposedDeadline] = useState(deadline.split('T')[0]);
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const existingBid = getMyBidForTask();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!message.trim()) {
            setError('Please provide a message with your quotation');
            return;
        }

        const budget = parseFloat(proposedBudget);
        if (isNaN(budget) || budget <= 0) {
            setError('Please enter a valid budget');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const { error: submitError } = await submitBid({
            proposed_budget: budget,
            proposed_deadline: proposedDeadline ? new Date(proposedDeadline).toISOString() : undefined,
            message: message.trim(),
        });

        setIsSubmitting(false);

        if (submitError) {
            setError(submitError.message || 'Failed to submit quotation');
        } else {
            onSuccess?.();
            onClose();
        }
    };

    if (existingBid) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <h3 className="font-semibold text-yellow-800 mb-2">You already submitted a quotation</h3>
                <p className="text-yellow-700 text-sm mb-3">
                    Your bid of ₹{existingBid.proposed_budget} is pending review.
                </p>
                <p className="text-yellow-600 text-xs">
                    Wait for the task owner to respond, or withdraw your bid to submit a new one.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Submit Quotation</h3>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <X size={20} className="text-gray-500" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Proposed Budget */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Proposed Budget
                    </label>
                    <div className="relative">
                        <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600" />
                        <input
                            type="number"
                            value={proposedBudget}
                            onChange={(e) => setProposedBudget(e.target.value)}
                            className="input pl-10"
                            placeholder="Enter your price"
                            min="1"
                            step="0.01"
                            required
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Original budget: ₹{currentBudget}
                    </p>
                </div>

                {/* Proposed Deadline */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Proposed Deadline (optional)
                    </label>
                    <div className="relative">
                        <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                        <input
                            type="date"
                            value={proposedDeadline}
                            onChange={(e) => setProposedDeadline(e.target.value)}
                            className="input pl-10"
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>
                </div>

                {/* Message */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Message to Task Owner
                    </label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="input min-h-[120px] resize-none"
                        placeholder="Explain why you're the best person for this task, your experience, and any questions you have..."
                        required
                    />
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <Send size={18} />
                            Submit Quotation
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
