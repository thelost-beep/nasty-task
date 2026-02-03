import { useMemo, useState } from 'react';
import {
  Clock,
  DollarSign,
  User,
  Star,
  Calendar,
  CheckCircle,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { VerificationBadge } from '../ui/VerificationBadge';

import { Task } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTasks } from '../../hooks/useTasks';
import { LikeButton } from './LikeButton';

/* -----------------------------
   Utility: time ago formatter
   (replaces date-fns if needed)
-------------------------------- */
function timeFromNow(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onProfileClick?: (userId: string) => void;
}

export function TaskCard({ task, onClick, onProfileClick }: TaskCardProps) {
  const { profile } = useAuth();
  const { deleteTask } = useTasks();
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = profile?.id === task.owner_id;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this task? This cannot be undone.')) return;

    setIsDeleting(true);
    await deleteTask(task.id);
    setIsDeleting(false);
  };
  const isDeadlineSoon = useMemo(() => {
    const deadlineTime = new Date(task.deadline).getTime();
    return deadlineTime - Date.now() < 24 * 60 * 60 * 1000;
  }, [task.deadline]);

  /* -----------------------------
     UI helpers
  -------------------------------- */
  const statusStyles = useMemo(() => {
    switch (task.status) {
      case 'OPEN':
        return { color: 'bg-green-100 text-green-800', icon: <AlertCircle size={16} /> };
      case 'IN_PROGRESS':
        return { color: 'bg-blue-100 text-blue-800', icon: <Clock size={16} /> };
      case 'DELIVERED':
        return { color: 'bg-yellow-100 text-yellow-800', icon: <CheckCircle size={16} /> };
      case 'DONE':
        return { color: 'bg-gray-100 text-gray-800', icon: <CheckCircle size={16} /> };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: <Clock size={16} /> };
    }
  }, [task.status]);

  /* -----------------------------
     Render
  -------------------------------- */
  return (
    <div
      onClick={onClick}
      className="card-interactive animate-fade-in-up hover-lift group overflow-hidden"
    >
      {/* Gradient Accent Border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className={`badge ${statusStyles.color} transform transition-all duration-300 hover:scale-105`}
              >
                {statusStyles.icon}
                <span className="font-semibold">{task.status.replace('_', ' ')}</span>
              </span>

              <span className="badge bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm hover:shadow-md transition-shadow">
                {task.subject}
              </span>
            </div>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
              {task.title}
            </h3>

            <p className="text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed mb-4">
              {task.description}
            </p>

            {/* Image Preview - Article Style */}
            {task.attachments && task.attachments.filter((a: any) => a.file_type?.startsWith('image/')).length > 0 && (
              <div className="grid grid-cols-1 gap-2 mb-4">
                {task.attachments.filter((a: any) => a.file_type?.startsWith('image/')).slice(0, 2).map((img: any, i: number) => (
                  <div key={img.id} className={`rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 ${i === 0 ? 'aspect-video' : 'h-32'}`}>
                    <img
                      src={img.file_url}
                      alt={img.file_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {task.attachments.filter((a: any) => a.file_type?.startsWith('image/')).length > 2 && (
                  <div className="text-xs text-gray-400 font-medium text-center">
                    +{task.attachments.filter((a: any) => a.file_type?.startsWith('image/')).length - 2} more images
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Meta Information Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          {/* Budget */}
          <div className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg border border-green-100 dark:border-green-800 transition-all hover:bg-green-100 dark:hover:bg-green-900/30">
            <DollarSign size={18} className="text-green-600 dark:text-green-400 flex-shrink-0" />
            <span className="font-bold text-green-700 dark:text-green-300 text-base">
              ₹{task.budget}
            </span>
          </div>

          {/* Deadline with Urgency Indicator */}
          <div
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-all ${isDeadlineSoon
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 animate-pulse-slow'
              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
          >
            <Calendar size={18} className={`flex-shrink-0 ${isDeadlineSoon ? 'text-red-600' : 'text-gray-600'}`} />
            <span className="font-medium">
              {timeFromNow(task.deadline)}
            </span>
          </div>

          {/* Owner */}
          {task.owner && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (task.owner) onProfileClick?.(task.owner.id);
              }}
              className="flex items-center gap-2 text-sm bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded-lg border border-purple-100 dark:border-purple-800 transition-all hover:bg-purple-100 dark:hover:bg-purple-900/30 cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-800 flex items-center justify-center border border-purple-200 dark:border-purple-700 flex-shrink-0">
                {task.owner.avatar_url ? (
                  <img src={task.owner.avatar_url} alt={task.owner.full_name} className="w-full h-full object-cover" />
                ) : (
                  <User size={14} className="text-purple-600 dark:text-purple-400" />
                )}
              </div>
              <span className="font-medium text-purple-700 dark:text-purple-300 truncate hover:underline">{task.owner.full_name}</span>
              {task.owner.is_verified && (
                <VerificationBadge size={14} className="flex-shrink-0" />
              )}
            </div>
          )}

          {/* Rating */}
          {task.owner && (task.owner.rating ?? 0) > 0 && (
            <div className="flex items-center gap-2 text-sm bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 rounded-lg border border-yellow-100 dark:border-yellow-800 transition-all hover:bg-yellow-100 dark:hover:bg-yellow-900/30">
              <Star size={18} strokeWidth={2.5} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />
              <span className="font-semibold text-yellow-700">{(task.owner.rating ?? 0).toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                Posted {timeFromNow(task.created_at)}
              </span>
            </div>

            {/* Like Button */}
            <LikeButton taskId={task.id} />
          </div>

          <div className="flex items-center gap-3">
            {task.status !== 'OPEN' && task.accepted_user && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 flex-shrink-0">
                  {task.accepted_user.avatar_url ? (
                    <img src={task.accepted_user.avatar_url} alt={task.accepted_user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={12} className="text-gray-500" />
                  )}
                </div>
                <span className="font-medium">
                  {task.accepted_user.full_name}
                </span>
              </div>
            )}

            {isOwner ? (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                title="Delete Task"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Trash2 size={18} />
                )}
              </button>
            ) : (
              task.status === 'OPEN' && (
                <button
                  onClick={onClick}
                  className="btn-primary text-sm shadow-md hover:shadow-xl px-4 py-2"
                >
                  Place Bid
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Hover Glow Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
      </div>
    </div>
  );
}
