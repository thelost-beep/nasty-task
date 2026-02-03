import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface LikeButtonProps {
    taskId: string;
}

export function LikeButton({ taskId }: LikeButtonProps) {
    const { profile } = useAuth();
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (profile) {
            fetchLikeStatus();
        }
    }, [taskId, profile]);

    const fetchLikeStatus = async () => {
        if (!profile) return;

        try {
            // Check if user has liked
            const { data: likeData } = await supabase
                .from('likes')
                .select('id')
                .eq('task_id', taskId)
                .eq('user_id', profile.id)
                .single();

            setIsLiked(!!likeData);

            // Get total like count
            const { count } = await supabase
                .from('likes')
                .select('*', { count: 'exact', head: true })
                .eq('task_id', taskId);

            setLikeCount(count || 0);
        } catch (error) {
            console.error('Error fetching like status:', error);
        }
    };

    // Subscribe to real-time like updates
    useEffect(() => {
        const subscription = supabase
            .channel(`likes_${taskId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'likes', filter: `task_id=eq.${taskId}` },
                async () => {
                    // Refetch like count when any like change occurs
                    const { count } = await supabase
                        .from('likes')
                        .select('*', { count: 'exact', head: true })
                        .eq('task_id', taskId);

                    setLikeCount(count || 0);

                    // If user is logged in, check their like status
                    if (profile) {
                        const { data } = await supabase
                            .from('likes')
                            .select('id')
                            .eq('task_id', taskId)
                            .eq('user_id', profile.id)
                            .single();

                        setIsLiked(!!data);
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [taskId, profile]);

    const handleToggleLike = async () => {
        if (!profile || loading) return;

        setLoading(true);
        try {
            if (isLiked) {
                // Unlike
                const { error } = await supabase
                    .from('likes')
                    .delete()
                    .eq('task_id', taskId)
                    .eq('user_id', profile.id);

                if (error) throw error;
                setIsLiked(false);
                setLikeCount((prev) => Math.max(0, prev - 1));
            } else {
                // Like
                const { error } = await supabase
                    .from('likes')
                    .insert({
                        task_id: taskId,
                        user_id: profile.id,
                    });

                if (error) throw error;
                setIsLiked(true);
                setLikeCount((prev) => prev + 1);
            }
        } catch (error) {
            console.error('Error toggling like:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleToggleLike}
            disabled={loading || !profile}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isLiked
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
            <Heart
                size={20}
                className={`transition-all ${isLiked ? 'fill-current animate-pulse' : ''}`}
            />
            <span>{likeCount}</span>
        </button>
    );
}
