import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ViewersChart, EngagementChart, SentimentGauge, StatsCard } from '../components/Analytics';
import { analyticsApi, streamApi, Stream, StreamAnalytics } from '../services/api';
import { useAuth } from '../App';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [analytics, setAnalytics] = useState<StreamAnalytics[]>([]);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [overview, setOverview] = useState({
    totalStreams: 0,
    liveStreams: 0,
    totalMessages: 0,
    peakViewers: 0,
    avgEngagement: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('1h');

  useEffect(() => {
    loadOverview();
    loadStreams();
  }, []);

  useEffect(() => {
    if (selectedStream) {
      loadStreamAnalytics();
    }
  }, [selectedStream, period]);

  const loadOverview = async () => {
    try {
      const response = await analyticsApi.getUserAnalytics();
      setOverview(response.data.overview as typeof overview);
    } catch (err) {
      console.error('Failed to load overview:', err);
    }
  };

  const loadStreams = async () => {
    try {
      const response = await streamApi.list();
      const userStreams = response.data.streams.filter(
        (s) => s.userId === user?.id
      );
      setStreams(userStreams);

      if (userStreams.length > 0 && !selectedStream) {
        setSelectedStream(userStreams[0].id);
      }
    } catch (err) {
      console.error('Failed to load streams:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStreamAnalytics = async () => {
    if (!selectedStream) return;

    try {
      const [analyticsResponse, summaryResponse] = await Promise.all([
        analyticsApi.getStreamAnalytics(selectedStream, { period }),
        analyticsApi.getStreamSummary(selectedStream),
      ]);

      setAnalytics(analyticsResponse.data.analytics);
      setSummary(summaryResponse.data.summary);
    } catch (err) {
      console.error('Failed to load stream analytics:', err);
    }
  };

  const selectedStreamData = streams.find((s) => s.id === selectedStream);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          <span className="gradient-text">Analytics</span>
        </h1>
        <p className="text-slate-400">
          Track your stream performance and audience engagement.
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatsCard
          icon="📺"
          label="Total Streams"
          value={overview.totalStreams}
          gradient="from-indigo-500 to-purple-500"
        />
        <StatsCard
          icon="🔴"
          label="Live Now"
          value={overview.liveStreams}
          gradient="from-red-500 to-orange-500"
        />
        <StatsCard
          icon="💬"
          label="Total Messages"
          value={overview.totalMessages.toLocaleString()}
          gradient="from-cyan-500 to-blue-500"
        />
        <StatsCard
          icon="📈"
          label="Peak Viewers"
          value={overview.peakViewers.toLocaleString()}
          gradient="from-green-500 to-emerald-500"
        />
        <StatsCard
          icon="🔥"
          label="Avg Engagement"
          value={`${overview.avgEngagement.toFixed(0)}%`}
          gradient="from-orange-500 to-amber-500"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : streams.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold mb-2">No streams yet</h2>
          <p className="text-slate-400 mb-6">
            Create and run a stream to see analytics here.
          </p>
          <Link to="/studio" className="btn-gradient">
            Go to Studio
          </Link>
        </div>
      ) : (
        <>
          {/* Stream Selector */}
          <div className="glass-card p-4 mb-8">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <label className="form-label">Select Stream</label>
                <select
                  value={selectedStream || ''}
                  onChange={(e) => setSelectedStream(e.target.value)}
                  className="glass-input"
                >
                  {streams.map((stream) => (
                    <option key={stream.id} value={stream.id}>
                      {stream.title} ({stream.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Time Period</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="glass-input"
                >
                  <option value="1h">Last Hour</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stream Summary */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="glass-card p-4">
                <p className="text-sm text-slate-400 mb-1">Peak Viewers</p>
                <p className="text-2xl font-bold">
                  {(summary.peakViewers as number)?.toLocaleString() || 0}
                </p>
              </div>
              <div className="glass-card p-4">
                <p className="text-sm text-slate-400 mb-1">Avg Viewers</p>
                <p className="text-2xl font-bold">
                  {((summary.avgViewers as number) || 0).toFixed(0)}
                </p>
              </div>
              <div className="glass-card p-4">
                <p className="text-sm text-slate-400 mb-1">Chat Messages</p>
                <p className="text-2xl font-bold">
                  {(summary.totalChatMessages as number)?.toLocaleString() || 0}
                </p>
              </div>
              <div className="glass-card p-4">
                <p className="text-sm text-slate-400 mb-1">Duration</p>
                <p className="text-2xl font-bold">
                  {formatDuration((summary.duration as number) || 0)}
                </p>
              </div>
            </div>
          )}

          {/* Charts */}
          {analytics.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ViewersChart data={analytics} />
                </div>
                <div>
                  <SentimentGauge
                    sentiment={
                      analytics.length > 0
                        ? analytics[analytics.length - 1].sentiment
                        : 0
                    }
                  />
                </div>
              </div>

              <EngagementChart data={analytics} />

              {/* Stream Details */}
              {selectedStreamData && (
                <div className="glass-card p-6">
                  <h3 className="text-xl font-bold mb-4">Stream Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-slate-400">Title</p>
                      <p className="font-medium">{selectedStreamData.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Status</p>
                      <p className="font-medium capitalize">
                        {selectedStreamData.status === 'live' ? (
                          <span className="text-red-400">Live</span>
                        ) : selectedStreamData.status === 'ended' ? (
                          <span className="text-slate-400">Ended</span>
                        ) : (
                          <span className="text-green-400">Ready</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Category</p>
                      <p className="font-medium">
                        {selectedStreamData.category || 'Uncategorized'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Started</p>
                      <p className="font-medium">
                        {selectedStreamData.startedAt
                          ? new Date(selectedStreamData.startedAt).toLocaleString()
                          : 'Not started'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <div className="text-6xl mb-4">📈</div>
              <h3 className="text-xl font-semibold mb-2">No analytics data</h3>
              <p className="text-slate-400">
                Start streaming to generate analytics data.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
