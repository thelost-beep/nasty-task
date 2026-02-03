import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  DollarSign,
  User,
  Star,
  Calendar,
  FileText,
  MessageCircle,
  CheckCircle,
  Download,
  Gavel,
  Send
} from 'lucide-react';
import { VerificationBadge } from '../ui/VerificationBadge';
import { Task } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTasks } from '../../hooks/useTasks';
import { BidModal } from '../bids/BidModal';
import { BidList } from '../bids/BidList';
import { CommentSection } from '../comments/CommentSection';
import { RateUserModal } from '../analytics/RateUserModal';
import { supabase } from '../../lib/supabase';

interface TaskAttachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

interface TaskDetailProps {
  task: Task;
  onBack: () => void;
  onStartChat: () => void;
  onStartDM?: (recipientId: string) => void;
  onProfileClick?: (userId: string) => void;
}

export function TaskDetail({ task, onBack, onStartChat, onStartDM, onProfileClick }: TaskDetailProps) {
  const { profile } = useAuth();
  const { updateTaskStatus, refreshTasks } = useTasks();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showBidForm, setShowBidForm] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{ id: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'bids' | 'comments'>('details');
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  const isOwner = profile?.id === task.owner_id;
  const isAcceptedUser = profile?.id === task.accepted_user_id;
  const canBid = task.status === 'OPEN' && !isOwner && profile?.status === 'active';
  const canChat = (isOwner || isAcceptedUser) && task.status !== 'OPEN';

  const handleStatusUpdate = async (newStatus: Task['status']) => {
    setIsUpdating(true);
    try {
      await updateTaskStatus(task.id, newStatus);
      await refreshTasks();

      // If marking as DONE, prompt owner to rate worker
      if (newStatus === 'DONE' && isOwner && task.accepted_user) {
        setRatingTarget({
          id: task.accepted_user.id,
          name: task.accepted_user.full_name
        });
        setShowRatingModal(true);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (task.attachments) {
      setAttachments(task.attachments);
      setLoadingAttachments(false);
      return;
    }

    const fetchAttachments = async () => {
      setLoadingAttachments(true);
      try {
        const { data, error } = await supabase
          .from('task_attachments')
          .select('*')
          .eq('task_id', task.id);

        if (error) throw error;
        setAttachments(data || []);
      } catch (error) {
        console.error('Error fetching attachments:', error);
      } finally {
        setLoadingAttachments(false);
      }
    };

    fetchAttachments();
  }, [task.id, task.attachments]);


  const handleStartConversation = (recipientId: string) => {
    if (onStartDM) {
      onStartDM(recipientId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'DELIVERED': return 'bg-yellow-100 text-yellow-800';
      case 'DONE': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const timeUntilDeadline = () => {
    const now = new Date();
    const deadline = new Date(task.deadline);
    const diff = deadline.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diff < 0) return 'Overdue';
    if (days > 0) return `${days} days, ${hours} hours left`;
    return `${hours} hours left`;
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Feed</span>
          </button>

          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
            {task.status.replace('_', ' ')}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-3">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {task.subject}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${new Date(task.deadline) < new Date()
                ? 'bg-red-100 text-red-800'
                : 'bg-orange-100 text-orange-800'
                }`}>
                {timeUntilDeadline()}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">{task.title}</h1>

            <div className="prose max-w-none mb-6">
              <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
            </div>

            {/* Task Attachments */}
            {(task.file_url || attachments.length > 0 || loadingAttachments) && (
              <div className="space-y-6 mb-8 pt-6 border-t border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText size={24} className="text-blue-500" />
                  Task Materials & Images
                </h3>

                {loadingAttachments ? (
                  <div className="flex items-center gap-3 text-gray-500 py-4 bg-gray-50 rounded-xl justify-center border border-dashed border-gray-200">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-medium">Loading task materials...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Image Gallery */}
                    {attachments.filter(f => f.file_type?.startsWith('image/')).length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {attachments.filter(f => f.file_type?.startsWith('image/')).map((file) => (
                          <div key={file.id} className="group relative aspect-video rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 shadow-sm hover:shadow-md transition-all">
                            <img
                              src={file.file_url}
                              alt={file.file_name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                              <a
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
                                title="View Original"
                              >
                                <FileText size={20} />
                              </a>
                              <a
                                href={file.file_url}
                                download={file.file_name}
                                className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
                                title="Download"
                              >
                                <Download size={20} />
                              </a>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                              <p className="text-white text-sm font-medium truncate">{file.file_name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Document List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Legacy single attachment or non-image attachments */}
                      {task.file_url && (
                        <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-4 hover:border-blue-300 transition-all shadow-sm">
                          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileText size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">Main Reference</p>
                            <p className="text-xs text-gray-500 font-medium">Original Document</p>
                          </div>
                          <a
                            href={task.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Download size={20} />
                          </a>
                        </div>
                      )}

                      {attachments.filter(f => !f.file_type?.startsWith('image/')).map((file) => (
                        <div key={file.id} className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-4 hover:border-purple-300 transition-all shadow-sm">
                          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileText size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{file.file_name}</p>
                            <p className="text-xs text-gray-500 font-medium">
                              {(file.file_size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <a
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                          >
                            <Download size={20} />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Budget */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="text-green-600" size={20} />
                <span className="text-sm font-medium text-green-800">Budget</span>
              </div>
              <p className="text-2xl font-bold text-green-700">₹{task.budget}</p>
            </div>

            {/* Deadline */}
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="text-orange-600" size={20} />
                <span className="text-sm font-medium text-orange-800">Deadline</span>
              </div>
              <p className="text-sm text-orange-700">
                {new Date(task.deadline).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            {/* Task Owner */}
            {task.owner && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <User className="text-gray-600" size={20} />
                  <span className="text-sm font-medium text-gray-800">Posted by</span>
                </div>
                <div
                  className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors"
                  onClick={() => onProfileClick?.(task.owner!.id)}
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                    {task.owner.avatar_url ? (
                      <img src={task.owner.avatar_url} alt={task.owner.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-semibold text-sm">
                        {task.owner.full_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-gray-900 hover:underline">{task.owner.full_name}</p>
                      {task.owner.is_verified && (
                        <VerificationBadge size={14} />
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star size={12} className="text-yellow-500" />
                      <span className="text-xs text-gray-500">
                        {(task.owner.rating ?? 0).toFixed(1)} • {task.owner.completed_tasks ?? 0} tasks
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Accepted User */}
            {task.accepted_user && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle className="text-blue-600" size={20} />
                  <span className="text-sm font-medium text-blue-800">Working on this</span>
                </div>
                <div
                  className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors"
                  onClick={() => onProfileClick?.(task.accepted_user!.id)}
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                    {task.accepted_user.avatar_url ? (
                      <img src={task.accepted_user.avatar_url} alt={task.accepted_user.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-semibold text-sm">
                        {task.accepted_user.full_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-gray-900 hover:underline">{task.accepted_user.full_name}</p>
                      {task.accepted_user.is_verified && (
                        <VerificationBadge size={14} />
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star size={12} className="text-yellow-500" />
                      <span className="text-xs text-gray-500">
                        {(task.accepted_user.rating ?? 0).toFixed(1)} • {task.accepted_user.completed_tasks ?? 0} tasks
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Place Bid Button */}
          {canBid && (
            <button
              onClick={() => setShowBidForm(true)}
              className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-transform"
            >
              <Gavel size={20} />
              Place Your Bid
            </button>
          )}

          {/* Message Owner Button */}
          {!isOwner && task.owner && (
            <button
              onClick={() => handleStartConversation(task.owner_id)}
              className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 px-6 rounded-lg font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Send size={20} />
              Message Owner
            </button>
          )}

          {canChat && (
            <button
              onClick={onStartChat}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <MessageCircle size={20} />
              <span>Open Chat</span>
            </button>
          )}

          {isAcceptedUser && task.status === 'IN_PROGRESS' && (
            <button
              onClick={() => handleStatusUpdate('DELIVERED')}
              disabled={isUpdating}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3 px-6 rounded-lg font-medium hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 disabled:opacity-50"
            >
              {isUpdating ? 'Updating...' : 'Mark as Delivered'}
            </button>
          )}

          {isOwner && task.status === 'DELIVERED' && (
            <button
              onClick={() => handleStatusUpdate('DONE')}
              disabled={isUpdating}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50"
            >
              {isUpdating ? 'Updating...' : 'Mark as Complete'}
            </button>
          )}

          {isAcceptedUser && task.status === 'DONE' && task.owner && (
            <button
              onClick={() => {
                setRatingTarget({
                  id: task.owner!.id,
                  name: task.owner!.full_name
                });
                setShowRatingModal(true);
              }}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3 px-6 rounded-lg font-medium hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Star size={20} />
              Rate Owner
            </button>
          )}
        </div>


      </div>

      <BidModal
        isOpen={showBidForm}
        onClose={() => setShowBidForm(false)}
        taskId={task.id}
        taskTitle={task.title}
        taskBudget={task.budget}
        onBidSubmitted={() => {
          setShowBidForm(false);
          setActiveTab('bids');
          refreshTasks();
        }}
      />

      {/* Rating Modal */}
      {ratingTarget && (
        <RateUserModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          taskId={task.id}
          targetUserId={ratingTarget.id}
          targetUserName={ratingTarget.name}
          onRatingSubmitted={() => {
            refreshTasks();
          }}
        />
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${activeTab === 'details'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('bids')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${activeTab === 'bids'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Quotations
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${activeTab === 'comments'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Comments
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'details' && (
            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {activeTab === 'bids' && (
            <BidList
              taskId={task.id}
              taskOwnerId={task.owner_id}
              onBidAccepted={() => {
                refreshTasks();
              }}
            />
          )}

          {activeTab === 'comments' && (
            <CommentSection taskId={task.id} />
          )}
        </div>
      </div>
    </div>
  );
}