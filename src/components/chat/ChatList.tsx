import { useState, useEffect } from 'react';
import { MessageCircle, Clock, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase, Task } from '../../lib/supabase';

interface ChatListProps {
  onChatSelect: (task: Task) => void;
}

export function ChatList({ onChatSelect }: ChatListProps) {
  const { profile } = useAuth();
  const [chatTasks, setChatTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchChatTasks();
    }
  }, [profile]);

  const fetchChatTasks = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          owner:profiles!tasks_owner_id_fkey(*),
          accepted_user:profiles!tasks_accepted_user_id_fkey(*)
        `)
        .or(`owner_id.eq.${profile.id},accepted_user_id.eq.${profile.id}`)
        .neq('status', 'OPEN')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setChatTasks(data || []);
    } catch (error) {
      console.error('Error fetching chat tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOtherUser = (task: Task) => {
    return profile?.id === task.owner_id ? task.accepted_user : task.owner;
  };

  const timeFromNow = (date: string) => {
    const now = Date.now();
    const then = new Date(date).getTime();
    const diff = now - then;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'now';
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-8"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Messages</h1>
        <p className="text-gray-600">Chat with task collaborators</p>
      </div>

      <div className="space-y-4">
        {chatTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
            <p className="text-gray-500">
              Start by accepting a task or having someone accept yours!
            </p>
          </div>
        ) : (
          chatTasks.map((task) => {
            const otherUser = getOtherUser(task);
            
            return (
              <div
                key={task.id}
                onClick={() => onChatSelect(task)}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {otherUser?.full_name.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {otherUser?.full_name || 'Unknown User'}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {timeFromNow(task.updated_at)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 truncate mb-1">
                      {task.title}
                    </p>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                        task.status === 'DELIVERED' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-green-600 font-medium">
                        ₹{task.budget}
                      </span>
                    </div>
                  </div>
                  
                  <MessageCircle className="text-gray-400" size={20} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}