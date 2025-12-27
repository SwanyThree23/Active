import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StreamCard, { StreamCardSkeleton } from '../components/StreamCard';
import { StatsCard } from '../components/Analytics';
import { streamApi, analyticsApi, Stream } from '../services/api';
import { useAuth } from '../App';

export default function Dashboard() {
  const { user } = useAuth();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalStreams: 0,
    liveStreams: 0,
    totalMessages: 0,
    peakViewers: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [streamsResponse, analyticsResponse] = await Promise.all([
        streamApi.list({ limit: 12 }),
        analyticsApi.getUserAnalytics(),
      ]);

      setStreams(streamsResponse.data.streams);
      setStats(analyticsResponse.data.overview as typeof stats);
    } catch (err) {
      setError('Failed to load data');
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const liveStreams = streams.filter((s) => s.status === 'live');
  const recentStreams = streams.filter((s) => s.status !== 'live');

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, <span className="gradient-text">{user?.username}</span>
          </h1>
          <p className="text-slate-400">
            Here's what's happening with your streams today.
          </p>
        </div>
        <Link to="/studio" className="btn-gradient inline-flex items-center gap-2">
          <span>Go Live</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatsCard
          icon="📺"
          label="Total Streams"
          value={stats.totalStreams}
          gradient="from-indigo-500 to-purple-500"
        />
        <StatsCard
          icon="🔴"
          label="Live Now"
          value={stats.liveStreams}
          gradient="from-red-500 to-orange-500"
        />
        <StatsCard
          icon="💬"
          label="Total Messages"
          value={stats.totalMessages.toLocaleString()}
          gradient="from-cyan-500 to-blue-500"
        />
        <StatsCard
          icon="📈"
          label="Peak Viewers"
          value={stats.peakViewers.toLocaleString()}
          gradient="from-green-500 to-emerald-500"
        />
      </div>

      {/* Live Streams */}
      {liveStreams.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="live-dot" />
            <h2 className="section-header mb-0">Live Now</h2>
          </div>
          <div className="stream-grid">
            {liveStreams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        </section>
      )}

      {/* All Streams */}
      <section>
        <h2 className="section-header">Recent Streams</h2>

        {error && (
          <div className="text-center py-12">
            <p className="text-red-400">{error}</p>
            <button
              onClick={loadData}
              className="mt-4 btn-gradient"
            >
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="stream-grid">
            {[...Array(8)].map((_, i) => (
              <StreamCardSkeleton key={i} />
            ))}
          </div>
        ) : recentStreams.length > 0 ? (
          <div className="stream-grid">
            {recentStreams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        ) : (
          <div className="glass-card p-12 text-center">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-xl font-semibold mb-2">No streams yet</h3>
            <p className="text-slate-400 mb-6">
              Start your first stream to see it here!
            </p>
            <Link to="/studio" className="btn-gradient inline-flex items-center gap-2">
              <span>Create Stream</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Link>
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="mt-12">
        <h2 className="section-header">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/studio" className="glass-card-hover p-6 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-xl">🎥</span>
              </div>
              <div>
                <h3 className="font-semibold">Start Streaming</h3>
                <p className="text-sm text-slate-400">Go live with your audience</p>
              </div>
            </div>
          </Link>

          <Link to="/analytics" className="glass-card-hover p-6 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-xl">📊</span>
              </div>
              <div>
                <h3 className="font-semibold">View Analytics</h3>
                <p className="text-sm text-slate-400">Check your stream performance</p>
              </div>
            </div>
          </Link>

          <Link to="/notebooklm" className="glass-card-hover p-6 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-xl">📓</span>
              </div>
              <div>
                <h3 className="font-semibold">NotebookLM</h3>
                <p className="text-sm text-slate-400">AI-powered synthesis & podcasts</p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Tech Stack Showcase */}
      <section className="mt-12">
        <h2 className="section-header">Technology Stack</h2>
        <div className="glass-card p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { icon: '⚛️', name: 'React 18', desc: 'Frontend' },
              { icon: '📘', name: 'TypeScript', desc: 'Type Safety' },
              { icon: '🚀', name: 'Vite', desc: 'Build Tool' },
              { icon: '🎨', name: 'Tailwind', desc: 'Styling' },
              { icon: '🟢', name: 'Node.js', desc: 'Backend' },
              { icon: '🔌', name: 'Socket.IO', desc: 'Real-time' },
              { icon: '🐘', name: 'PostgreSQL', desc: 'Database' },
              { icon: '🔴', name: 'Redis', desc: 'Cache' },
              { icon: '🤖', name: 'Claude AI', desc: 'AI Agents' },
              { icon: '📊', name: 'Chart.js', desc: 'Analytics' },
              { icon: '🎬', name: 'HLS.js', desc: 'Video' },
              { icon: '🐳', name: 'Docker', desc: 'Deployment' },
            ].map((tech) => (
              <div key={tech.name} className="text-center p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <div className="text-2xl mb-2">{tech.icon}</div>
                <div className="font-medium text-sm">{tech.name}</div>
                <div className="text-xs text-slate-500">{tech.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
