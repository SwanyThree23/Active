import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { streamApi, Stream } from '../services/api';
import { useAuth } from '../App';

export default function Studio() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [myStreams, setMyStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadMyStreams();
  }, []);

  const loadMyStreams = async () => {
    try {
      setIsLoading(true);
      const response = await streamApi.list();
      const userStreams = response.data.streams.filter(
        (s) => s.userId === user?.id
      );
      setMyStreams(userStreams);
    } catch (err) {
      console.error('Failed to load streams:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsCreating(true);
    setError('');

    try {
      const response = await streamApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });

      setMyStreams([response.data.stream, ...myStreams]);
      setShowCreateModal(false);
      resetForm();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to create stream');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartStream = async (streamId: string) => {
    try {
      await streamApi.start(streamId);
      navigate(`/stream/${streamId}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error || 'Failed to start stream');
    }
  };

  const handleEndStream = async (streamId: string) => {
    try {
      await streamApi.end(streamId);
      loadMyStreams();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error || 'Failed to end stream');
    }
  };

  const handleDeleteStream = async (streamId: string) => {
    if (!confirm('Are you sure you want to delete this stream?')) return;

    try {
      await streamApi.delete(streamId);
      setMyStreams(myStreams.filter((s) => s.id !== streamId));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error || 'Failed to delete stream');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setTags('');
    setError('');
  };

  const liveStream = myStreams.find((s) => s.status === 'live');

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">Studio</span>
          </h1>
          <p className="text-slate-400">
            Manage your streams and go live.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-gradient inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Stream</span>
        </button>
      </div>

      {/* Live Stream Banner */}
      {liveStream && (
        <div className="glass-card p-6 mb-8 border-red-500/30 bg-gradient-to-r from-red-500/10 to-orange-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="live-indicator">
                <div className="live-dot" />
                <span>LIVE NOW</span>
              </div>
              <div>
                <h3 className="font-semibold">{liveStream.title}</h3>
                <p className="text-sm text-slate-400">
                  {liveStream.viewerCount || 0} viewers
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/stream/${liveStream.id}`)}
                className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              >
                View
              </button>
              <button
                onClick={() => handleEndStream(liveStream.id)}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                End Stream
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stream Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* OBS Configuration */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>🎥</span> Streaming Software Setup
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            Use these settings in OBS, Streamlabs, or any RTMP-compatible software.
          </p>

          <div className="space-y-4">
            <div>
              <label className="form-label">RTMP Server</label>
              <div className="glass-input flex items-center justify-between">
                <code className="text-sm text-indigo-400">
                  rtmp://stream.swanythree.com/live
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText('rtmp://stream.swanythree.com/live')}
                  className="text-slate-400 hover:text-white"
                >
                  📋
                </button>
              </div>
            </div>

            {myStreams[0] && (
              <div>
                <label className="form-label">Stream Key</label>
                <div className="glass-input flex items-center justify-between">
                  <code className="text-sm text-indigo-400">
                    {myStreams[0].streamKey.substring(0, 8)}...
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(myStreams[0].streamKey)}
                    className="text-slate-400 hover:text-white"
                  >
                    📋
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Keep your stream key private!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recommended Settings */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>⚙️</span> Recommended Settings
          </h2>

          <div className="space-y-4 text-sm">
            <div className="flex justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-slate-400">Resolution</span>
              <span>1920x1080 (1080p)</span>
            </div>
            <div className="flex justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-slate-400">Framerate</span>
              <span>30 or 60 FPS</span>
            </div>
            <div className="flex justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-slate-400">Video Bitrate</span>
              <span>4500-6000 Kbps</span>
            </div>
            <div className="flex justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-slate-400">Audio Bitrate</span>
              <span>128-320 Kbps</span>
            </div>
            <div className="flex justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-slate-400">Keyframe Interval</span>
              <span>2 seconds</span>
            </div>
          </div>
        </div>
      </div>

      {/* My Streams */}
      <section>
        <h2 className="section-header">My Streams</h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card p-4 space-y-4">
                <div className="skeleton-thumbnail" />
                <div className="skeleton-text w-3/4" />
                <div className="skeleton-text w-1/2" />
              </div>
            ))}
          </div>
        ) : myStreams.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-xl font-semibold mb-2">No streams yet</h3>
            <p className="text-slate-400 mb-6">
              Create your first stream to get started!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-gradient"
            >
              Create Stream
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myStreams.map((stream) => (
              <div key={stream.id} className="glass-card overflow-hidden">
                <div className="aspect-video bg-slate-800 relative">
                  {stream.thumbnailUrl ? (
                    <img
                      src={stream.thumbnailUrl}
                      alt={stream.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      🎬
                    </div>
                  )}
                  {stream.status === 'live' && (
                    <div className="absolute top-2 left-2 live-indicator">
                      <div className="live-dot" />
                      <span>LIVE</span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-semibold mb-1 truncate">{stream.title}</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    {stream.status === 'live'
                      ? `${stream.viewerCount || 0} viewers`
                      : stream.status === 'ended'
                      ? 'Stream ended'
                      : 'Ready to go live'}
                  </p>

                  <div className="flex gap-2">
                    {stream.status === 'offline' && (
                      <button
                        onClick={() => handleStartStream(stream.id)}
                        className="flex-1 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                      >
                        Go Live
                      </button>
                    )}
                    {stream.status === 'live' && (
                      <>
                        <button
                          onClick={() => navigate(`/stream/${stream.id}`)}
                          className="flex-1 px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-sm"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEndStream(stream.id)}
                          className="flex-1 px-3 py-2 bg-slate-600/50 rounded-lg hover:bg-slate-600/70 transition-colors text-sm"
                        >
                          End
                        </button>
                      </>
                    )}
                    {stream.status !== 'live' && (
                      <button
                        onClick={() => handleDeleteStream(stream.id)}
                        className="px-3 py-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Create Stream Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6">Create New Stream</h2>

            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateStream} className="space-y-4">
              <div className="form-group">
                <label htmlFor="title" className="form-label">
                  Title *
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="glass-input"
                  placeholder="Enter stream title"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description" className="form-label">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="glass-input min-h-[80px]"
                  placeholder="What's your stream about?"
                />
              </div>

              <div className="form-group">
                <label htmlFor="category" className="form-label">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="glass-input"
                >
                  <option value="">Select category</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Just Chatting">Just Chatting</option>
                  <option value="Music">Music</option>
                  <option value="Creative">Creative</option>
                  <option value="Sports">Sports</option>
                  <option value="Education">Education</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="tags" className="form-label">
                  Tags (comma separated)
                </label>
                <input
                  id="tags"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="glass-input"
                  placeholder="gaming, chill, english"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !title.trim()}
                  className="flex-1 btn-gradient disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Stream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
