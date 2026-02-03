import { useState, useEffect } from 'react';
import { Clock, DollarSign, User, Calendar, MessageCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase, Task } from '../../lib/supabase';
import { TaskSkeleton } from './TaskSkeleton';

interface MyTasksProps {
  onTaskClick: (task: Task) => void;
  onChatClick: (task: Task) => void;
}

export function MyTasks({ onTaskClick, onChatClick }: MyTasksProps) {
  const { profile } = useAuth();
  const [postedTasks, setPostedTasks] = useState<Task[]>([]);
  const [acceptedTasks, setAcceptedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posted' | 'accepted'>('posted');

  useEffect(() => {
    if (profile) {
      fetchMyTasks();
    }
  }, [profile]);

  const fetchMyTasks = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      // Fetch posted tasks
      const { data: posted, error: postedError } = await supabase
        .from('tasks')
        .select(`
          *,
          owner:profiles!tasks_owner_id_fkey(*),
          accepted_user:profiles!tasks_accepted_user_id_fkey(*)
        `)
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false });

      if (postedError) throw postedError;

      // Fetch accepted tasks
      const { data: accepted, error: acceptedError } = await supabase
        .from('tasks')
        .select(`
          *,
          owner:profiles!tasks_owner_id_fkey(*),
          accepted_user:profiles!tasks_accepted_user_id_fkey(*)
        `)
        .eq('accepted_user_id', profile.id)
        .order('created_at', { ascending: false });

      if (acceptedError) throw acceptedError;

      setPostedTasks(posted || []);
      setAcceptedTasks(accepted || []);
    } catch (error) {
      console.error('Error fetching my tasks:', error);
    } finally {
      setLoading(false);
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

  const TaskCard = ({ task, type }: { task: Task; type: 'posted' | 'accepted' }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                {task.status.replace('_', ' ')}
              </span>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {task.subject}
              </span>
            </div>
            <h3 
              className="text-lg font-semibold text-gray-900 mb-2 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => onTaskClick(task)}
            >
              {task.title}
            </h3>
            <p className="text-gray-600 line-clamp-2">{task.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2 text-sm">
            <DollarSign size={16} className="text-green-600" />
            <span className="font-semibold text-green-600">₹{task.budget}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar size={16} />
            <span>{new Date(task.deadline).toLocaleDateString()}</span>
          </div>
        </div>

        {type === 'posted' && task.accepted_user && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <User size={16} />
            <span>Working with {task.accepted_user.full_name}</span>
          </div>
        )}

        {type === 'accepted' && task.owner && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <User size={16} />
            <span>Posted by {task.owner.full_name}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-500">
            {timeFromNow(task.created_at)}
          </span>
          
          <div className="flex items-center space-x-2">
            {task.status !== 'OPEN' && (
              <button
                onClick={() => onChatClick(task)}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                <MessageCircle size={16} />
                <span>Chat</span>
              </button>
            )}
            <button
              onClick={() => onTaskClick(task)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <TaskSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const currentTasks = activeTab === 'posted' ? postedTasks : acceptedTasks;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Tasks</h1>
        <p className="text-gray-600">Manage your posted and accepted tasks</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('posted')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              activeTab === 'posted'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Posted Tasks ({postedTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('accepted')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              activeTab === 'accepted'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Accepted Tasks ({acceptedTasks.length})
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-6">
        {currentTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {activeTab} tasks yet
            </h3>
            <p className="text-gray-500">
              {activeTab === 'posted' 
                ? 'Start by posting your first task!' 
                : 'Browse the feed to find tasks to work on!'
              }
            </p>
          </div>
        ) : (
          currentTasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              type={activeTab}
            />
          ))
        )}
      </div>
    </div>
  );
}