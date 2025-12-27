import { useState, useEffect } from 'react';
import { notebookApi, Notebook, Podcast } from '../services/api';

export default function NotebookLMPage() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);

  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState<'text' | 'url'>('text');
  const [sourceContent, setSourceContent] = useState('');
  const [sourceTitle, setSourceTitle] = useState('');
  const [sources, setSources] = useState<Array<{ type: string; content: string; title?: string }>>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadNotebooks();
  }, []);

  const loadNotebooks = async () => {
    try {
      setIsLoading(true);
      const response = await notebookApi.list();
      setNotebooks(response.data.notebooks);
    } catch (err) {
      console.error('Failed to load notebooks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || sources.length === 0) return;

    setIsCreating(true);
    setError('');

    try {
      const response = await notebookApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        sources,
      });

      setNotebooks([response.data.notebook, ...notebooks]);
      setShowCreateModal(false);
      resetForm();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to create notebook');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddSource = () => {
    if (!sourceContent.trim()) return;

    setSources([
      ...sources,
      {
        type: sourceType,
        content: sourceContent.trim(),
        title: sourceTitle.trim() || undefined,
      },
    ]);
    setSourceContent('');
    setSourceTitle('');
  };

  const handleRemoveSource = (index: number) => {
    setSources(sources.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSources([]);
    setSourceContent('');
    setSourceTitle('');
    setError('');
  };

  const handleSelectNotebook = async (notebook: Notebook) => {
    setSelectedNotebook(notebook);
    setChatMessages([]);

    // Load full notebook details
    try {
      const response = await notebookApi.get(notebook.id);
      setSelectedNotebook(response.data.notebook);
    } catch (err) {
      console.error('Failed to load notebook:', err);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedNotebook || isChatting) return;

    const userMessage = chatInput.trim();
    setChatMessages([...chatMessages, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsChatting(true);

    try {
      const response = await notebookApi.chat(selectedNotebook.id, userMessage);
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.data.response },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleGeneratePodcast = async () => {
    if (!selectedNotebook || isGeneratingPodcast) return;

    setIsGeneratingPodcast(true);

    try {
      await notebookApi.generatePodcast(selectedNotebook.id, {
        duration: 'medium',
      });
      alert('Podcast generation started! You will be notified when it\'s ready.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error || 'Failed to start podcast generation');
    } finally {
      setIsGeneratingPodcast(false);
    }
  };

  const handleDeleteNotebook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notebook?')) return;

    try {
      await notebookApi.delete(id);
      setNotebooks(notebooks.filter((n) => n.id !== id));
      if (selectedNotebook?.id === id) {
        setSelectedNotebook(null);
      }
    } catch (err) {
      console.error('Failed to delete notebook:', err);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">NotebookLM</span>
          </h1>
          <p className="text-slate-400">
            AI-powered synthesis and podcast generation from your sources.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-gradient inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Notebook</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Notebooks List */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold mb-4">Your Notebooks</h2>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="glass-card p-4 space-y-2">
                  <div className="skeleton-text w-3/4" />
                  <div className="skeleton-text w-1/2" />
                </div>
              ))}
            </div>
          ) : notebooks.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <div className="text-4xl mb-2">📓</div>
              <p className="text-slate-400 text-sm">No notebooks yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notebooks.map((notebook) => (
                <div
                  key={notebook.id}
                  onClick={() => handleSelectNotebook(notebook)}
                  className={`glass-card p-4 cursor-pointer transition-all ${
                    selectedNotebook?.id === notebook.id
                      ? 'border-indigo-500/50 bg-indigo-500/10'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{notebook.title}</h3>
                      <p className="text-sm text-slate-400 truncate">
                        {(notebook.sources as unknown[]).length} sources
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotebook(notebook.id);
                      }}
                      className="text-slate-500 hover:text-red-400 p-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notebook Detail */}
        <div className="lg:col-span-2">
          {selectedNotebook ? (
            <div className="space-y-6">
              {/* Notebook Header */}
              <div className="glass-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedNotebook.title}</h2>
                    {selectedNotebook.description && (
                      <p className="text-slate-400 mt-1">{selectedNotebook.description}</p>
                    )}
                  </div>
                  <button
                    onClick={handleGeneratePodcast}
                    disabled={isGeneratingPodcast || !selectedNotebook.synthesis}
                    className="btn-gradient-accent flex items-center gap-2 disabled:opacity-50"
                  >
                    {isGeneratingPodcast ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>🎙️</span>
                    )}
                    Generate Podcast
                  </button>
                </div>

                {/* Sources */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Sources</h3>
                  <div className="flex flex-wrap gap-2">
                    {(selectedNotebook.sources as Array<{ type: string; title?: string; content: string }>).map((source, index) => (
                      <span
                        key={index}
                        className="badge-primary"
                        title={source.content}
                      >
                        {source.type === 'url' ? '🔗' : '📄'} {source.title || `Source ${index + 1}`}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Synthesis */}
                {selectedNotebook.synthesis && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-2">Synthesis</h3>
                    <p className="text-sm text-slate-300 line-clamp-4">
                      {selectedNotebook.synthesis}
                    </p>
                  </div>
                )}

                {/* Key Insights */}
                {selectedNotebook.keyInsights && (selectedNotebook.keyInsights as string[]).length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-slate-400 mb-2">Key Insights</h3>
                    <ul className="space-y-1">
                      {(selectedNotebook.keyInsights as string[]).map((insight, index) => (
                        <li key={index} className="text-sm text-slate-300 flex items-start gap-2">
                          <span className="text-indigo-400">•</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Podcasts */}
              {selectedNotebook.podcasts && selectedNotebook.podcasts.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold mb-4">Generated Podcasts</h3>
                  <div className="space-y-3">
                    {selectedNotebook.podcasts.map((podcast) => (
                      <div key={podcast.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🎙️</span>
                          <div>
                            <p className="font-medium">{podcast.title || 'Untitled Podcast'}</p>
                            <p className="text-sm text-slate-400">
                              {podcast.status === 'completed'
                                ? `${Math.floor((podcast.duration || 0) / 60)}:${String((podcast.duration || 0) % 60).padStart(2, '0')}`
                                : podcast.status === 'generating'
                                ? 'Generating...'
                                : 'Pending'}
                            </p>
                          </div>
                        </div>
                        {podcast.audioUrl && (
                          <audio controls className="h-10">
                            <source src={podcast.audioUrl} type="audio/mpeg" />
                          </audio>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4">Chat with your Notebook</h3>

                <div className="h-64 overflow-y-auto custom-scrollbar mb-4 space-y-3">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                      <p>Ask questions about your sources</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-xl ${
                            msg.role === 'user'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white/10 text-slate-200'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}
                  {isChatting && (
                    <div className="flex justify-start">
                      <div className="bg-white/10 p-3 rounded-xl">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleChat} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question..."
                    className="glass-input flex-1"
                    disabled={isChatting}
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isChatting}
                    className="btn-gradient px-4 disabled:opacity-50"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 text-center h-full flex flex-col items-center justify-center">
              <div className="text-6xl mb-4">📓</div>
              <h3 className="text-xl font-semibold mb-2">Select a Notebook</h3>
              <p className="text-slate-400">
                Choose a notebook from the list or create a new one.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Notebook Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6">Create New Notebook</h2>

            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateNotebook} className="space-y-4">
              <div className="form-group">
                <label htmlFor="notebook-title" className="form-label">
                  Title *
                </label>
                <input
                  id="notebook-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="glass-input"
                  placeholder="Enter notebook title"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="notebook-description" className="form-label">
                  Description
                </label>
                <textarea
                  id="notebook-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="glass-input min-h-[60px]"
                  placeholder="What is this notebook about?"
                />
              </div>

              {/* Sources */}
              <div className="form-group">
                <label className="form-label">Sources *</label>

                {sources.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {sources.map((source, index) => (
                      <span
                        key={index}
                        className="badge-primary flex items-center gap-1"
                      >
                        {source.type === 'url' ? '🔗' : '📄'} {source.title || `Source ${index + 1}`}
                        <button
                          type="button"
                          onClick={() => handleRemoveSource(index)}
                          className="ml-1 hover:text-red-400"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={sourceType}
                      onChange={(e) => setSourceType(e.target.value as 'text' | 'url')}
                      className="glass-input w-24"
                    >
                      <option value="text">Text</option>
                      <option value="url">URL</option>
                    </select>
                    <input
                      type="text"
                      value={sourceTitle}
                      onChange={(e) => setSourceTitle(e.target.value)}
                      className="glass-input flex-1"
                      placeholder="Source title (optional)"
                    />
                  </div>

                  <div className="flex gap-2">
                    {sourceType === 'url' ? (
                      <input
                        type="url"
                        value={sourceContent}
                        onChange={(e) => setSourceContent(e.target.value)}
                        className="glass-input flex-1"
                        placeholder="https://example.com/article"
                      />
                    ) : (
                      <textarea
                        value={sourceContent}
                        onChange={(e) => setSourceContent(e.target.value)}
                        className="glass-input flex-1 min-h-[80px]"
                        placeholder="Paste your text content here..."
                      />
                    )}
                    <button
                      type="button"
                      onClick={handleAddSource}
                      disabled={!sourceContent.trim()}
                      className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-50 self-end"
                    >
                      Add
                    </button>
                  </div>
                </div>
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
                  disabled={isCreating || !title.trim() || sources.length === 0}
                  className="flex-1 btn-gradient disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Notebook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
