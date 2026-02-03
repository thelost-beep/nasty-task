import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface RateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    taskId: string;
    targetUserId: string;
    targetUserName: string;
    onRatingSubmitted: () => void;
}

export function RateUserModal({
    isOpen,
    onClose,
    taskId,
    targetUserId,
    targetUserName,
    onRatingSubmitted
}: RateUserModalProps) {
    const { profile } = useAuth();
    const [stars, setStars] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [hoveredStar, setHoveredStar] = useState(0);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (stars === 0) return;
        if (!profile) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('ratings')
                .insert({
                    task_id: taskId,
                    from_user_id: profile.id,
                    to_user_id: targetUserId,
                    stars,
                    comment
                });

            if (error) throw error;
            onRatingSubmitted();
            onClose();
        } catch (error) {
            console.error('Error submitting rating:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-in">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Rate {targetUserName}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex justify-center space-x-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onMouseEnter={() => setHoveredStar(star)}
                                onMouseLeave={() => setHoveredStar(0)}
                                onClick={() => setStars(star)}
                                className="transition-transform hover:scale-110 focus:outline-none"
                            >
                                <Star
                                    size={32}
                                    className={`${star <= (hoveredStar || stars)
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-300'
                                        } transition-colors`}
                                />
                            </button>
                        ))}
                    </div>

                    <div className="text-center text-sm font-medium text-gray-600">
                        {stars > 0 ? (
                            stars === 5 ? 'Excellent!' :
                                stars === 4 ? 'Very Good' :
                                    stars === 3 ? 'Good' :
                                        stars === 2 ? 'Fair' : 'Poor'
                        ) : 'Select a rating'}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Comment (Optional)
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="input w-full min-h-[100px]"
                            placeholder="Share your experience working with this person..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || stars === 0}
                        className="btn-primary w-full py-3"
                    >
                        {loading ? 'Submitting...' : 'Submit Rating'}
                    </button>
                </form>
            </div>
        </div>
    );
}
