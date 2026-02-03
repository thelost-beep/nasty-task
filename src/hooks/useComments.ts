import { useState, useEffect, useCallback } from 'react';
import { supabase, Comment } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useComments(taskId?: string) {
    const { profile } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchComments = useCallback(async () => {
        if (!taskId) {
            setComments([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('comments')
                .select(`
          *,
          user:profiles!comments_user_id_fkey(*)
        `)
                .eq('task_id', taskId)
                .order('created_at', { ascending: true });

            if (fetchError) throw fetchError;

            // Organize comments into threads
            const commentMap = new Map<string, Comment>();
            const rootComments: Comment[] = [];

            (data || []).forEach(comment => {
                commentMap.set(comment.id, { ...comment, replies: [] });
            });

            (data || []).forEach(comment => {
                const c = commentMap.get(comment.id)!;
                if (comment.parent_id && commentMap.has(comment.parent_id)) {
                    commentMap.get(comment.parent_id)!.replies!.push(c);
                } else {
                    rootComments.push(c);
                }
            });

            setComments(rootComments);
        } catch (err) {
            console.error('Error fetching comments:', err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    useEffect(() => {
        fetchComments();

        // Subscribe to real-time updates
        if (taskId) {
            const subscription = supabase
                .channel(`comments_${taskId}`)
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'comments', filter: `task_id=eq.${taskId}` },
                    () => {
                        // Refetch to maintain proper threading
                        fetchComments();
                    }
                )
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [taskId, fetchComments]);

    const addComment = async (content: string, parentId?: string) => {
        if (!profile || !taskId) {
            return { data: null, error: new Error('Not authenticated or no task') };
        }

        try {
            const { data, error } = await supabase
                .from('comments')
                .insert({
                    task_id: taskId,
                    user_id: profile.id,
                    content,
                    parent_id: parentId || null,
                })
                .select(`
          *,
          user:profiles!comments_user_id_fkey(*)
        `)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (err) {
            console.error('Error adding comment:', err);
            return { data: null, error: err as Error };
        }
    };

    const updateComment = async (commentId: string, content: string) => {
        try {
            const { data, error } = await supabase
                .from('comments')
                .update({ content, updated_at: new Date().toISOString() })
                .eq('id', commentId)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (err) {
            console.error('Error updating comment:', err);
            return { data: null, error: err as Error };
        }
    };

    const deleteComment = async (commentId: string) => {
        try {
            const { error } = await supabase
                .from('comments')
                .delete()
                .eq('id', commentId);

            if (error) throw error;
            return { error: null };
        } catch (err) {
            console.error('Error deleting comment:', err);
            return { error: err as Error };
        }
    };

    const getCommentCount = () => {
        const countAll = (cmts: Comment[]): number => {
            return cmts.reduce((acc, c) => acc + 1 + countAll(c.replies || []), 0);
        };
        return countAll(comments);
    };

    return {
        comments,
        loading,
        error,
        addComment,
        updateComment,
        deleteComment,
        getCommentCount,
        refreshComments: fetchComments,
    };
}
