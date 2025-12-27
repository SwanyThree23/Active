import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  connect(token: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    // Re-attach listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket?.on(event, callback);
      });
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Stream room management
  joinStream(streamId: string): void {
    this.socket?.emit('join-stream', streamId);
  }

  leaveStream(streamId: string): void {
    this.socket?.emit('leave-stream', streamId);
  }

  // Chat
  sendMessage(streamId: string, message: string): void {
    this.socket?.emit('chat-message', { streamId, message });
  }

  startTyping(streamId: string): void {
    this.socket?.emit('typing-start', streamId);
  }

  stopTyping(streamId: string): void {
    this.socket?.emit('typing-stop', streamId);
  }

  // Event listeners
  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
    this.socket?.on(event, callback);
  }

  off(event: string, callback: (...args: unknown[]) => void): void {
    this.listeners.get(event)?.delete(callback);
    this.socket?.off(event, callback);
  }

  // Specific event handlers
  onNewMessage(callback: (message: ChatMessage) => void): () => void {
    this.on('new-message', callback as (...args: unknown[]) => void);
    return () => this.off('new-message', callback as (...args: unknown[]) => void);
  }

  onMessageDeleted(callback: (data: { messageId: string }) => void): () => void {
    this.on('message-deleted', callback as (...args: unknown[]) => void);
    return () => this.off('message-deleted', callback as (...args: unknown[]) => void);
  }

  onViewerCount(callback: (data: { streamId: string; count: number }) => void): () => void {
    this.on('viewer-count', callback as (...args: unknown[]) => void);
    return () => this.off('viewer-count', callback as (...args: unknown[]) => void);
  }

  onAnalyticsUpdate(callback: (data: { streamId: string; analytics: unknown }) => void): () => void {
    this.on('analytics-update', callback as (...args: unknown[]) => void);
    return () => this.off('analytics-update', callback as (...args: unknown[]) => void);
  }

  onStreamStarted(callback: (data: { streamId: string; stream: unknown }) => void): () => void {
    this.on('stream-started', callback as (...args: unknown[]) => void);
    return () => this.off('stream-started', callback as (...args: unknown[]) => void);
  }

  onStreamEnded(callback: (data: { streamId: string }) => void): () => void {
    this.on('stream-ended', callback as (...args: unknown[]) => void);
    return () => this.off('stream-ended', callback as (...args: unknown[]) => void);
  }

  onUserTyping(callback: (data: { userId: string; username: string }) => void): () => void {
    this.on('user-typing', callback as (...args: unknown[]) => void);
    return () => this.off('user-typing', callback as (...args: unknown[]) => void);
  }

  onUserStoppedTyping(callback: (data: { userId: string }) => void): () => void {
    this.on('user-stopped-typing', callback as (...args: unknown[]) => void);
    return () => this.off('user-stopped-typing', callback as (...args: unknown[]) => void);
  }

  onTaskCompleted(callback: (data: { taskId: string; status: string; output: unknown }) => void): () => void {
    this.on('task-completed', callback as (...args: unknown[]) => void);
    return () => this.off('task-completed', callback as (...args: unknown[]) => void);
  }

  onPodcastReady(callback: (data: { podcastId: string; status: string; audioUrl: string }) => void): () => void {
    this.on('podcast-ready', callback as (...args: unknown[]) => void);
    return () => this.off('podcast-ready', callback as (...args: unknown[]) => void);
  }

  onWorkflowCompleted(callback: (data: { executionId: string; status: string; output: unknown }) => void): () => void {
    this.on('workflow-completed', callback as (...args: unknown[]) => void);
    return () => this.off('workflow-completed', callback as (...args: unknown[]) => void);
  }
}

interface ChatMessage {
  id: string;
  message: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

// Singleton instance
export const socketService = new SocketService();
export default socketService;
