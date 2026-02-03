import { useState, useEffect, useRef } from 'react';
import {
    Send,
    ArrowLeft,
    Loader2,
    MessageCircle,
    Users,
    FileText,
    Clock
} from 'lucide-react';
import { VerificationBadge } from '../ui/VerificationBadge';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat';
import { useDirectMessages } from '../../hooks/useDirectMessages';
import { supabase, Task } from '../../lib/supabase';

type ChatType = 'task' | 'dm';
type ViewMode = 'list' | 'chat';

interface ConversationItem {
    id: string;
    type: ChatType;
    otherUserName: string;
    otherUserInitial: string;
    otherUserVerified?: boolean;
    lastMessage?: string;
    lastTime: string;
    taskTitle?: string;
    taskStatus?: string;
    taskBudget?: number;
    taskId?: string;
    recipientId?: string;
}

interface UnifiedMessagesProps {
    onBack?: () => void;
    initialTaskId?: string;
    initialRecipientId?: string;
}

export function UnifiedMessages({
    onBack,
    initialTaskId,
    initialRecipientId
}: UnifiedMessagesProps) {
    const { profile } = useAuth();
    const [viewMode, setViewMode] = useState<ViewMode>(
        initialTaskId || initialRecipientId ? 'chat' : 'list'
    );
    const [activeTab, setActiveTab] = useState<'all' | 'tasks' | 'dms'>('all');
    const [activeChatType, setActiveChatType] = useState<ChatType | null>(
        initialTaskId ? 'task' : initialRecipientId ? 'dm' : null
    );
    const [activeTaskId, setActiveTaskId] = useState<string | null>(initialTaskId || null);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [activeDmRecipientId, setActiveDmRecipientId] = useState<string | null>(initialRecipientId || null);

    const [taskChats, setTaskChats] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Sync state with props for navigation
    useEffect(() => {
        if (initialTaskId) {
            setActiveChatType('task');
            setActiveTaskId(initialTaskId);
            setActiveConversationId(null);
            setActiveDmRecipientId(null);
            setViewMode('chat');
        } else if (initialRecipientId) {
            setActiveChatType('dm');
            setActiveDmRecipientId(initialRecipientId);
            setActiveTaskId(null);
            setActiveConversationId(null);
            setViewMode('chat');
        } else {
            // Only go back to list if we are navigating TO the messages page without IDs
            // We don't want to force back to list if the user is already interacting
            setViewMode('list');
            setActiveChatType(null);
            setActiveTaskId(null);
            setActiveConversationId(null);
            setActiveDmRecipientId(null);
        }
    }, [initialTaskId, initialRecipientId]);

    // Hooks for active chat
    const taskChat = useChat(activeTaskId || '');
    const dmChat = useDirectMessages(activeConversationId || undefined);

    const messages = activeChatType === 'task' ? taskChat.messages : dmChat.messages;
    const isLoadingMessages = activeChatType === 'task' ? taskChat.loading : dmChat.loading;

    // Fetch task chats
    useEffect(() => {
        if (profile) {
            fetchTaskChats();
        }
    }, [profile]);

    // Start DM conversation if recipient provided
    useEffect(() => {
        if (activeDmRecipientId && !activeConversationId) {
            dmChat.startConversation(activeDmRecipientId, activeTaskId || undefined).then(({ data }) => {
                if (data) {
                    setActiveConversationId(data);
                }
            });
        }
    }, [activeDmRecipientId, activeTaskId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Update conversation list when messages change
    useEffect(() => {
        if (activeChatType === 'task' && taskChat.messages.length > 0) {
            const lastMsg = taskChat.messages[taskChat.messages.length - 1];
            setTaskChats(prev => prev.map(t =>
                t.id === activeTaskId
                    ? { ...t, updated_at: lastMsg.created_at }
                    : t
            ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
        }
    }, [taskChat.messages, activeChatType, activeTaskId]);

    // Real-time task list updates (e.g. when a task is accepted)
    useEffect(() => {
        if (!profile) return;

        const subscription = supabase
            .channel('task_list_updates')
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'tasks'
                },
                (payload) => {
                    const task = payload.new as Task;
                    // If the user is part of this task and it's not OPEN, refresh
                    if ((task.owner_id === profile.id || task.accepted_user_id === profile.id) && task.status !== 'OPEN') {
                        fetchTaskChats();
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [profile]);

    const fetchTaskChats = async () => {
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
            setTaskChats(data || []);
        } catch (error) {
            console.error('Error fetching task chats:', error);
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

    const formatMessageTime = (date: string) => {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const messageToSend = newMessage.trim();
        if (!messageToSend || isSending) return;

        setNewMessage(''); // Clear immediately for instant feel
        setIsSending(true);

        if (activeChatType === 'task' && activeTaskId) {
            await taskChat.sendMessage(messageToSend);
        } else if (activeChatType === 'dm') {
            await dmChat.sendMessage(messageToSend);
        }

        setIsSending(false);
    };

    const openTaskChat = (task: Task) => {
        setActiveChatType('task');
        setActiveTaskId(task.id);
        setActiveConversationId(null);
        setActiveDmRecipientId(null);
        setViewMode('chat');
    };

    const openDmChat = (conversationId: string) => {
        setActiveChatType('dm');
        setActiveConversationId(conversationId);
        setActiveTaskId(null);
        setActiveDmRecipientId(null);
        setViewMode('chat');
    };

    const backToList = () => {
        setViewMode('list');
        setActiveChatType(null);
        setActiveTaskId(null);
        setActiveConversationId(null);
        setActiveDmRecipientId(null);
    };

    // Build combined conversation list
    const getConversationList = (): ConversationItem[] => {
        const items: ConversationItem[] = [];

        // Add task chats
        if (activeTab === 'all' || activeTab === 'tasks') {
            taskChats.forEach(task => {
                const other = getOtherUser(task);
                items.push({
                    id: task.id,
                    type: 'task',
                    otherUserName: other?.full_name || 'Unknown User',
                    otherUserInitial: other?.full_name?.charAt(0).toUpperCase() || '?',
                    otherUserVerified: other?.is_verified,
                    lastTime: task.updated_at,
                    taskTitle: task.title,
                    taskStatus: task.status,
                    taskBudget: task.budget,
                    taskId: task.id,
                });
            });
        }

        // Add DM conversations
        if (activeTab === 'all' || activeTab === 'dms') {
            dmChat.conversations.forEach(conv => {
                const other = dmChat.getOtherParticipant(conv);
                items.push({
                    id: conv.id,
                    type: 'dm',
                    otherUserName: other?.full_name || 'Unknown User',
                    otherUserInitial: other?.full_name?.charAt(0).toUpperCase() || '?',
                    otherUserVerified: other?.is_verified,
                    lastMessage: conv.last_message?.content,
                    lastTime: conv.updated_at,
                    recipientId: other?.id,
                });
            });
        }

        // Sort by last time
        return items.sort((a, b) =>
            new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
        );
    };

    // Determine current chat info for header
    const getCurrentChatInfo = () => {
        if (activeChatType === 'task' && activeTaskId) {
            const task = taskChats.find(t => t.id === activeTaskId);
            const other = task ? getOtherUser(task) : null;
            return {
                name: other?.full_name || 'Unknown User',
                initial: other?.full_name?.charAt(0).toUpperCase() || '?',
                isVerified: other?.is_verified,
                subtitle: task?.title || 'Task Chat',
            };
        } else if (activeChatType === 'dm' && activeConversationId) {
            const conv = dmChat.conversations.find(c => c.id === activeConversationId);
            const other = conv ? dmChat.getOtherParticipant(conv) : null;
            return {
                name: other?.full_name || 'Unknown User',
                initial: other?.full_name?.charAt(0).toUpperCase() || '?',
                isVerified: other?.is_verified,
                subtitle: 'Direct Message',
            };
        }
        return { name: 'Chat', initial: '?', isVerified: false, subtitle: '' };
    };

    // Conversation List View
    if (viewMode === 'list') {
        const conversations = getConversationList();

        return (
            <div className="max-w-4xl mx-auto animate-fade-in">
                <div className="flex items-center gap-4 mb-6">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
                        <p className="text-gray-600 text-sm">Task chats and direct messages</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {(['all', 'tasks', 'dms'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === tab
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {tab === 'all' ? 'All' : tab === 'tasks' ? 'Task Chats' : 'Direct Messages'}
                        </button>
                    ))}
                </div>

                {loading && dmChat.loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="text-center py-12">
                        <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
                        <p className="text-gray-500">
                            Start by accepting a task or messaging a task owner
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {conversations.map(conv => (
                            <button
                                key={`${conv.type}-${conv.id}`}
                                onClick={() => {
                                    if (conv.type === 'task') {
                                        const task = taskChats.find(t => t.id === conv.taskId);
                                        if (task) openTaskChat(task);
                                    } else {
                                        openDmChat(conv.id);
                                    }
                                }}
                                className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all text-left"
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${conv.type === 'task'
                                    ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                                    : 'bg-gradient-to-br from-green-500 to-teal-600'
                                    }`}>
                                    <span className="text-white font-bold">{conv.otherUserInitial}</span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">{conv.otherUserName}</span>
                                            {conv.otherUserVerified && (
                                                <VerificationBadge size={14} className="shrink-0" />
                                            )}
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${conv.type === 'task'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-green-100 text-green-700'
                                                }`}>
                                                {conv.type === 'task' ? 'Task' : 'DM'}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <Clock size={12} />
                                            {timeFromNow(conv.lastTime)}
                                        </span>
                                    </div>

                                    {conv.type === 'task' ? (
                                        <div className="flex items-center gap-2">
                                            <FileText size={14} className="text-gray-400" />
                                            <span className="text-sm text-gray-600 truncate">{conv.taskTitle}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${conv.taskStatus === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                                conv.taskStatus === 'DELIVERED' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                {conv.taskStatus?.replace('_', ' ')}
                                            </span>
                                            {conv.taskBudget && (
                                                <span className="text-xs text-green-600 font-medium">₹{conv.taskBudget}</span>
                                            )}
                                        </div>
                                    ) : conv.lastMessage && (
                                        <p className="text-sm text-gray-500 truncate">{conv.lastMessage}</p>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Chat View
    const chatInfo = getCurrentChatInfo();

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex flex-col animate-fade-in">
            {/* Chat Header */}
            <div className="flex items-center gap-4 p-4 bg-white rounded-t-xl border border-gray-200">
                <button
                    onClick={backToList}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeChatType === 'task'
                    ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                    : 'bg-gradient-to-br from-green-500 to-teal-600'
                    }`}>
                    <span className="text-white font-bold">{chatInfo.initial}</span>
                </div>
                <div>
                    <div className="flex items-center gap-1.5">
                        <h2 className="font-semibold text-gray-900">{chatInfo.name}</h2>
                        {chatInfo.isVerified && (
                            <VerificationBadge size={16} className="shrink-0" />
                        )}
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                        {activeChatType === 'task' ? <FileText size={12} /> : <Users size={12} />}
                        {chatInfo.subtitle}
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 border-x border-gray-200 space-y-3">
                {isLoadingMessages ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500">No messages yet. Say hello! 👋</p>
                    </div>
                ) : (
                    messages.map(msg => {
                        const senderId = 'sender_id' in msg ? msg.sender_id : (msg as any).sender?.id;
                        const isOwn = senderId === profile?.id;

                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[70%] px-4 py-2 rounded-2xl ${isOwn
                                        ? 'bg-blue-600 text-white rounded-br-none'
                                        : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    <p className={`text-xs mt-1 ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
                                        {formatMessageTime(msg.created_at)}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
                onSubmit={handleSendMessage}
                className="p-4 bg-white rounded-b-xl border border-gray-200 flex gap-3"
            >
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="input flex-1"
                    autoFocus
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className="btn-primary px-4"
                >
                    {isSending ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : (
                        <Send size={20} />
                    )}
                </button>
            </form>
        </div>
    );
}
