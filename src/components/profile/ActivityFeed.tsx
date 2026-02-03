import { useState, useEffect } from 'react';
import {
    FileText,
    CheckCircle,
    Gavel,
    Star,
    Heart,
    Clock,
    ArrowRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ActivityLog {
    id: string;
    type: 'task_posted' | 'task_accepted' | 'task_completed' | 'bid_placed' | 'rating_received' | 'task_liked';
    created_at: string;
    task_id: string;
    related_user_id: string;
    metadata: any;
    task?: { title: string };
    related_user?: { full_name: string };
}

interface ActivityFeedProps {
    userId: string;
}

export function ActivityFeed({ userId }: ActivityFeedProps) {
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('activity_log')
                    .select(`
            *,
            task:tasks(title),
            related_user:profiles!activity_log_related_user_id_fkey(full_name)
          `)
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (error) throw error;
                setActivities(data || []);
            } catch (error) {
                console.error('Error fetching activity:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchActivity();
    }, [userId]);

    const getActivityConfig = (type: ActivityLog['type']) => {
        switch (type) {
            case 'task_posted':
                return { icon: <FileText className="text-blue-500" />, label: 'Posted a new task' };
            case 'task_accepted':
                return { icon: <ArrowRight className="text-indigo-500" />, label: 'Accepted a task' };
            case 'task_completed':
                return { icon: <CheckCircle className="text-green-500" />, label: 'Completed a task' };
            case 'bid_placed':
                return { icon: <Gavel className="text-yellow-600" />, label: 'Placed a bid' };
            case 'rating_received':
                return { icon: <Star className="text-orange-500" />, label: 'Received a rating' };
            case 'task_liked':
                return { icon: <Heart className="text-red-500" />, label: 'Liked a task' };
            default:
                return { icon: <Clock className="text-gray-500" />, label: 'Activity' };
        }
    };

    const timeAgo = (date: string) => {
        const now = new Date();
        const then = new Date(date);
        const diff = now.getTime() - then.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No activity yet</h3>
                <p className="text-gray-500 dark:text-gray-400">Complete some tasks to see your history here!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {activities.map((activity) => {
                const config = getActivityConfig(activity.type);
                return (
                    <div
                        key={activity.id}
                        className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group"
                    >
                        <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            {config.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-gray-900 dark:text-white truncate">
                                    {config.label}
                                </span>
                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                    {timeAgo(activity.created_at)}
                                </span>
                            </div>

                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {activity.task?.title ? (
                                    <>On task <span className="text-blue-600 dark:text-blue-400 font-medium">"{activity.task.title}"</span></>
                                ) : activity.type === 'rating_received' ? (
                                    `Received ${activity.metadata?.stars} stars`
                                ) : (
                                    'Updated status'
                                )}
                                {activity.related_user?.full_name && (
                                    ` involving ${activity.related_user.full_name}`
                                )}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
