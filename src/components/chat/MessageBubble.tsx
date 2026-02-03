import { Message } from '../../lib/supabase';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const messageTime = new Date(message.created_at);

  const formatTime = (date: Date) => {
    const now = Date.now();
    const then = date.getTime();
    const diff = now - then;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return date.toLocaleDateString();
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'now';
  };

  return (
    <div className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && (
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex-shrink-0 mb-6">
          {message.sender?.avatar_url ? (
            <img src={message.sender.avatar_url} alt={message.sender.full_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500">
              {message.sender?.full_name.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
        </div>
      )}
      <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${isOwn ? 'order-1' : 'order-2'}`}>
        {!isOwn && message.sender && (
          <div className="text-[10px] font-semibold text-gray-500 mb-1 px-1 uppercase tracking-wider">
            {message.sender.full_name}
          </div>
        )}
        <div
          className={`px-4 py-3 rounded-2xl ${isOwn
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
            : 'bg-white border border-gray-200 text-gray-900'
            }`}
        >
          <p className="break-words whitespace-pre-wrap">{message.content}</p>
          {message.file_url && (
            <div className="mt-2">
              <a
                href={message.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-sm underline ${isOwn ? 'text-blue-100' : 'text-blue-600'
                  }`}
              >
                📎 View attachment
              </a>
            </div>
          )}
        </div>
        <div className={`text-xs text-gray-500 mt-1 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
          {formatTime(messageTime)}
        </div>
      </div>
    </div>
  );
}