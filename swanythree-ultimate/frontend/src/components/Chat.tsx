import { useState, useEffect, useRef } from 'react';
import { chatApi, ChatMessage } from '../services/api';
import socketService from '../services/socket';
import { useAuth } from '../App';

interface ChatProps {
  streamId: string;
  isLive?: boolean;
}

export default function Chat({ streamId, isLive = true }: ChatProps) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadMessages();
  }, [streamId]);

  useEffect(() => {
    if (!token) return;

    // Connect socket
    socketService.connect(token);
    socketService.joinStream(streamId);

    // Listen for new messages
    const unsubMessage = socketService.onNewMessage((message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Listen for message deletions
    const unsubDelete = socketService.onMessageDeleted(({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    // Listen for typing indicators
    const unsubTyping = socketService.onUserTyping(({ userId, username }) => {
      if (userId !== user?.id) {
        setTypingUsers((prev) => new Map(prev).set(userId, username));
      }
    });

    const unsubStopTyping = socketService.onUserStoppedTyping(({ userId }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    });

    return () => {
      unsubMessage();
      unsubDelete();
      unsubTyping();
      unsubStopTyping();
      socketService.leaveStream(streamId);
    };
  }, [streamId, token, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const response = await chatApi.getMessages(streamId);
      setMessages(response.data.messages);
    } catch (err) {
      setError('Failed to load messages');
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      await chatApi.sendMessage(streamId, newMessage.trim());
      setNewMessage('');
      socketService.stopTyping(streamId);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    // Typing indicator
    socketService.startTyping(streamId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(streamId);
    }, 2000);
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await chatApi.deleteMessage(messageId);
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="glass-card h-full flex flex-col">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold">Live Chat</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-semibold">Live Chat</h3>
        {isLive && (
          <div className="live-indicator">
            <div className="live-dot" />
            <span>LIVE</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <p>No messages yet</p>
            <p className="text-sm">Be the first to say something!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="chat-message group">
              <div className="chat-avatar">
                {message.user.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-sm">{message.user.username}</span>
                  <span className="text-xs text-slate-500">{formatTime(message.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-300 break-words">{message.message}</p>
              </div>
              {(message.user.id === user?.id) && (
                <button
                  onClick={() => handleDeleteMessage(message.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                  title="Delete message"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.size > 0 && (
        <div className="px-4 py-2 text-sm text-slate-400">
          {Array.from(typingUsers.values()).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-2 text-sm text-red-400 bg-red-500/10">
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder={isLive ? "Send a message..." : "Chat is disabled"}
            disabled={!isLive || isSending}
            className="glass-input flex-1"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending || !isLive}
            className="btn-gradient px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
