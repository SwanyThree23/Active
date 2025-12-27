import { Link } from 'react-router-dom';
import { Stream } from '../services/api';

interface StreamCardProps {
  stream: Stream;
}

export default function StreamCard({ stream }: StreamCardProps) {
  const formatViewers = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const formatDuration = (startedAt?: string): string => {
    if (!startedAt) return '';
    const start = new Date(startedAt);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000);

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Link to={`/stream/${stream.id}`} className="stream-card block">
      {/* Thumbnail */}
      <div className="stream-card-thumbnail">
        {stream.thumbnailUrl ? (
          <img
            src={stream.thumbnailUrl}
            alt={stream.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center">
            <span className="text-4xl">🎬</span>
          </div>
        )}

        {/* Overlay */}
        <div className="stream-card-overlay" />

        {/* Live Badge */}
        {stream.status === 'live' && (
          <div className="absolute top-3 left-3">
            <div className="live-indicator">
              <div className="live-dot" />
              <span>LIVE</span>
            </div>
          </div>
        )}

        {/* Viewer Count */}
        {stream.status === 'live' && stream.viewerCount !== undefined && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/60 rounded-full text-xs">
            <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8" />
            </svg>
            <span>{formatViewers(stream.viewerCount)} viewers</span>
          </div>
        )}

        {/* Duration */}
        {stream.status === 'live' && stream.startedAt && (
          <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 rounded text-xs">
            {formatDuration(stream.startedAt)}
          </div>
        )}

        {/* Category Badge */}
        {stream.category && (
          <div className="absolute bottom-3 left-3 px-2 py-1 bg-indigo-600/80 rounded text-xs">
            {stream.category}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
            {stream.user.avatarUrl ? (
              <img
                src={stream.user.avatarUrl}
                alt={stream.user.username}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-bold">
                {stream.user.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate" title={stream.title}>
              {stream.title}
            </h3>
            <p className="text-sm text-slate-400 truncate">
              {stream.user.username}
            </p>
            {stream.description && (
              <p className="text-xs text-slate-500 truncate mt-1">
                {stream.description}
              </p>
            )}
          </div>
        </div>

        {/* Tags */}
        {stream.tags && stream.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {stream.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-400"
              >
                {tag}
              </span>
            ))}
            {stream.tags.length > 3 && (
              <span className="px-2 py-0.5 text-xs text-slate-500">
                +{stream.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

// Loading skeleton
export function StreamCardSkeleton() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="skeleton-thumbnail" />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="skeleton-avatar" />
          <div className="flex-1 space-y-2">
            <div className="skeleton-text w-3/4" />
            <div className="skeleton-text w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}
