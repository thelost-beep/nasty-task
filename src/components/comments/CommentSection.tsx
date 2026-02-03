import { useState } from 'react';
import { MessageSquare, Reply, Trash2, Loader2, Send } from 'lucide-react';
import { Comment } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useComments } from '../../hooks/useComments';

interface CommentSectionProps {
    taskId: string;
}

export function CommentSection({ taskId }: CommentSectionProps) {
    const { profile } = useAuth();
    const { comments, loading, addComment, deleteComment, getCommentCount } = useComments(taskId);
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !profile) return;

        setIsSubmitting(true);
        await addComment(newComment.trim());
        setNewComment('');
        setIsSubmitting(false);
    };

    const handleSubmitReply = async (parentId: string) => {
        if (!replyContent.trim() || !profile) return;

        setIsSubmitting(true);
        await addComment(replyContent.trim(), parentId);
        setReplyContent('');
        setReplyingTo(null);
        setIsSubmitting(false);
    };

    const handleDeleteComment = async (commentId: string) => {
        if (window.confirm('Are you sure you want to delete this comment?')) {
            await deleteComment(commentId);
        }
    };

    const timeFromNow = (date: string) => {
        const now = Date.now();
        const then = new Date(date).getTime();
        const diff = now - then;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor(diff / (1000 * 60));

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    };

    const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => {
        const isOwn = profile?.id === comment.user_id;
        const maxDepth = 3;

        return (
            <div className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-100 pl-4' : ''}`}>
                <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-xs">
                            {comment.user?.full_name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 text-sm">
                                {comment.user?.full_name || 'Unknown User'}
                            </span>
                            <span className="text-xs text-gray-400">
                                {timeFromNow(comment.created_at)}
                            </span>
                        </div>

                        <p className="text-gray-700 text-sm whitespace-pre-wrap mb-2">
                            {comment.content}
                        </p>

                        <div className="flex items-center gap-3">
                            {depth < maxDepth && (
                                <button
                                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                    <Reply size={12} />
                                    Reply
                                </button>
                            )}
                            {isOwn && (
                                <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                                >
                                    <Trash2 size={12} />
                                    Delete
                                </button>
                            )}
                        </div>

                        {/* Reply Form */}
                        {replyingTo === comment.id && (
                            <div className="mt-3 flex gap-2">
                                <input
                                    type="text"
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    placeholder="Write a reply..."
                                    className="input text-sm flex-1"
                                    autoFocus
                                />
                                <button
                                    onClick={() => handleSubmitReply(comment.id)}
                                    disabled={!replyContent.trim() || isSubmitting}
                                    className="btn-primary px-3 py-2"
                                >
                                    {isSubmitting ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Send size={16} />
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-2">
                        {comment.replies.map(reply => (
                            <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading comments...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <MessageSquare size={20} className="text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                    Comments ({getCommentCount()})
                </h3>
            </div>

            {/* Add Comment Form */}
            {profile ? (
                <form onSubmit={handleSubmitComment} className="flex gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-sm">
                            {profile.full_name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="flex-1 flex gap-2">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            className="input flex-1"
                        />
                        <button
                            type="submit"
                            disabled={!newComment.trim() || isSubmitting}
                            className="btn-primary px-4"
                        >
                            {isSubmitting ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Send size={18} />
                            )}
                        </button>
                    </div>
                </form>
            ) : (
                <p className="text-gray-500 text-sm">Sign in to leave a comment</p>
            )}

            {/* Comments List */}
            <div className="space-y-4">
                {comments.length === 0 ? (
                    <div className="text-center py-8">
                        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No comments yet. Be the first to comment!</p>
                    </div>
                ) : (
                    comments.map(comment => (
                        <CommentItem key={comment.id} comment={comment} />
                    ))
                )}
            </div>
        </div>
    );
}
