import { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Loader2, MessageCircle } from 'lucide-react';
import { useDirectMessages } from '../../hooks/useDirectMessages';
import { useAuth } from '../../hooks/useAuth';

interface DirectMessagesProps {
    onBack?: () => void;
    initialConversationId?: string;
    initialRecipientId?: string;
    initialTaskId?: string;
}

export function DirectMessages({
    onBack,
    initialConversationId,
    initialRecipientId,
    initialTaskId
}: DirectMessagesProps) {
    const { profile } = useAuth();
    const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversationId || null);
    const {
        conversations,
        messages,
        loading,
        startConversation,
        sendMessage,
        getOtherParticipant
    } = useDirectMessages(activeConversationId || undefined);

    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Start conversation if recipient is provided
    useEffect(() => {
        if (initialRecipientId && !activeConversationId) {
            startConversation(initialRecipientId, initialTaskId).then(({ data }) => {
                if (data) {
                    setActiveConversationId(data);
                }
            });
        }
    }, [initialRecipientId, initialTaskId, activeConversationId, startConversation]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isSending) return;

        setIsSending(true);
        await sendMessage(newMessage.trim());
        setNewMessage('');
        setIsSending(false);
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

    // Conversation List View
    if (!activeConversationId) {
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
                    <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="text-center py-12">
                        <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
                        <p className="text-gray-500">
                            Start a conversation by submitting a quotation or messaging a task owner
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {conversations.map(conv => {
                            const other = getOtherParticipant(conv);
                            return (
                                <button
                                    key={conv.id}
                                    onClick={() => setActiveConversationId(conv.id)}
                                    className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all text-left"
                                >
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-bold">
                                            {other?.full_name?.charAt(0).toUpperCase() || '?'}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-gray-900">
                                                {other?.full_name || 'Unknown User'}
                                            </span>
                                            {conv.last_message && (
                                                <span className="text-xs text-gray-400">
                                                    {timeFromNow(conv.last_message.created_at)}
                                                </span>
                                            )}
                                        </div>
                                        {conv.last_message && (
                                            <p className="text-sm text-gray-500 truncate">
                                                {conv.last_message.sender_id === profile?.id ? 'You: ' : ''}
                                                {conv.last_message.content}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // Chat View
    const activeConv = conversations.find(c => c.id === activeConversationId);
    const otherUser = activeConv ? getOtherParticipant(activeConv) : null;

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex flex-col animate-fade-in">
            {/* Chat Header */}
            <div className="flex items-center gap-4 p-4 bg-white rounded-t-xl border border-gray-200">
                <button
                    onClick={() => setActiveConversationId(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">
                        {otherUser?.full_name?.charAt(0).toUpperCase() || '?'}
                    </span>
                </div>
                <div>
                    <h2 className="font-semibold text-gray-900">
                        {otherUser?.full_name || 'Unknown User'}
                    </h2>
                    {activeConv?.task_id && (
                        <p className="text-xs text-gray-500">Regarding a task</p>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 border-x border-gray-200 space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500">No messages yet. Say hello! 👋</p>
                    </div>
                ) : (
                    messages.map(msg => {
                        const isOwn = msg.sender_id === profile?.id;
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
