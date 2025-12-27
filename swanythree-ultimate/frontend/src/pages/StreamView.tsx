import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import Chat from '../components/Chat';
import { RealTimeStats, ViewersChart, EngagementChart, SentimentGauge } from '../components/Analytics';
import { streamApi, analyticsApi, Stream, StreamAnalytics } from '../services/api';
import socketService from '../services/socket';
import { useAuth } from '../App';

export default function StreamView() {
  const { streamId } = useParams<{ streamId: string }>();
  const { token } = useAuth();
  const [stream, setStream] = useState<Stream | null>(null);
  const [analytics, setAnalytics] = useState<StreamAnalytics[]>([]);
  const [realtime, setRealtime] = useState({
    viewers: 0,
    peakViewers: 0,
    chatMessagesPerMinute: 0,
    engagementScore: 0,
    sentiment: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    if (streamId) {
      loadStream();
      loadAnalytics();
    }
  }, [streamId]);

  useEffect(() => {
    if (!token || !streamId) return;

    socketService.connect(token);
    socketService.joinStream(streamId);

    const unsubViewers = socketService.onViewerCount(({ count }) => {
      setRealtime((prev) => ({
        ...prev,
        viewers: count,
        peakViewers: Math.max(prev.peakViewers, count),
      }));
    });

    const unsubAnalytics = socketService.onAnalyticsUpdate(({ analytics }) => {
      const a = analytics as StreamAnalytics;
      setRealtime((prev) => ({
        ...prev,
        viewers: a.viewers,
        peakViewers: Math.max(prev.peakViewers, a.peakViewers),
        engagementScore: a.engagementScore,
        sentiment: a.sentiment,
      }));
      setAnalytics((prev) => [...prev, a]);
    });

    const unsubEnded = socketService.onStreamEnded(() => {
      setStream((prev) => prev ? { ...prev, status: 'ended' } : null);
    });

    return () => {
      unsubViewers();
      unsubAnalytics();
      unsubEnded();
      socketService.leaveStream(streamId);
    };
  }, [token, streamId]);

  const loadStream = async () => {
    if (!streamId) return;

    try {
      setIsLoading(true);
      const response = await streamApi.get(streamId);
      setStream(response.data.stream);
      setRealtime((prev) => ({
        ...prev,
        viewers: response.data.stream.viewerCount || 0,
      }));
    } catch (err) {
      setError('Failed to load stream');
      console.error('Failed to load stream:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalytics = async () => {
    if (!streamId) return;

    try {
      const [analyticsResponse, realtimeResponse] = await Promise.all([
        analyticsApi.getStreamAnalytics(streamId, { period: '1h' }),
        analyticsApi.getRealtime(streamId),
      ]);

      setAnalytics(analyticsResponse.data.analytics);
      setRealtime(realtimeResponse.data.realtime as typeof realtime);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="page-container">
        <div className="glass-card p-12 text-center">
          <div className="text-6xl mb-4">📺</div>
          <h2 className="text-2xl font-bold mb-2">{error || 'Stream not found'}</h2>
          <p className="text-slate-400 mb-6">
            The stream you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/dashboard" className="btn-gradient">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video + Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player */}
          <div className="relative">
            {stream.status === 'live' && stream.hlsUrl ? (
              <VideoPlayer
                src={stream.hlsUrl}
                poster={stream.thumbnailUrl}
                autoPlay
              />
            ) : (
              <div className="video-container flex items-center justify-center bg-slate-900">
                <div className="text-center">
                  <div className="text-6xl mb-4">📺</div>
                  <p className="text-xl font-semibold mb-2">Stream Offline</p>
                  <p className="text-slate-400">This stream is not currently live.</p>
                </div>
              </div>
            )}
          </div>

          {/* Stream Info */}
          <div className="glass-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  {stream.user.avatarUrl ? (
                    <img
                      src={stream.user.avatarUrl}
                      alt={stream.user.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold">
                      {stream.user.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold mb-1">{stream.title}</h1>
                  <p className="text-slate-400">{stream.user.username}</p>
                  {stream.description && (
                    <p className="text-sm text-slate-500 mt-2">{stream.description}</p>
                  )}
                </div>
              </div>
              {stream.status === 'live' && (
                <div className="live-indicator">
                  <div className="live-dot" />
                  <span>LIVE</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {stream.tags && stream.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {stream.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="badge-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Analytics Toggle */}
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="glass-card p-4 w-full flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <span className="font-semibold">Stream Analytics</span>
            <svg
              className={`w-5 h-5 transition-transform ${showAnalytics ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Analytics Section */}
          {showAnalytics && (
            <div className="space-y-6 animate-slide-in">
              <RealTimeStats {...realtime} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ViewersChart data={analytics} />
                <SentimentGauge sentiment={realtime.sentiment} />
              </div>

              <EngagementChart data={analytics} />
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="lg:col-span-1">
          <div className="h-[600px] lg:h-[calc(100vh-12rem)] lg:sticky lg:top-24">
            <Chat streamId={stream.id} isLive={stream.status === 'live'} />
          </div>
        </div>
      </div>
    </div>
  );
}
