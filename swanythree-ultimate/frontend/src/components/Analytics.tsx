import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

Chart.register(...registerables);

interface AnalyticsData {
  timestamp: string;
  viewers: number;
  chatMessages: number;
  engagementScore: number;
  sentiment: number;
}

interface AnalyticsChartProps {
  data: AnalyticsData[];
  currentViewers?: number;
}

export function ViewersChart({ data }: AnalyticsChartProps) {
  const chartData = {
    labels: data.map((d) => {
      const date = new Date(d.timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }),
    datasets: [
      {
        label: 'Viewers',
        data: data.map((d) => d.viewers),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#fff',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#64748b',
          maxTicksLimit: 6,
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#64748b',
        },
        beginAtZero: true,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  return (
    <div className="glass-card p-4">
      <h3 className="font-semibold mb-4">Viewer Count</h3>
      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

export function EngagementChart({ data }: AnalyticsChartProps) {
  const chartData = {
    labels: data.map((d) => {
      const date = new Date(d.timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }),
    datasets: [
      {
        label: 'Engagement',
        data: data.map((d) => d.engagementScore),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
      },
      {
        label: 'Chat Messages',
        data: data.map((d) => d.chatMessages),
        borderColor: 'rgb(34, 211, 238)',
        backgroundColor: 'rgba(34, 211, 238, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#fff',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#64748b',
          maxTicksLimit: 6,
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#64748b',
        },
        beginAtZero: true,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  return (
    <div className="glass-card p-4">
      <h3 className="font-semibold mb-4">Engagement & Chat Activity</h3>
      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

interface SentimentGaugeProps {
  sentiment: number; // -1 to 1
}

export function SentimentGauge({ sentiment }: SentimentGaugeProps) {
  // Convert sentiment from -1 to 1 range to 0-100
  const normalizedSentiment = ((sentiment + 1) / 2) * 100;

  const getSentimentColor = () => {
    if (sentiment > 0.3) return { color: 'rgb(34, 197, 94)', label: 'Positive' };
    if (sentiment < -0.3) return { color: 'rgb(239, 68, 68)', label: 'Negative' };
    return { color: 'rgb(234, 179, 8)', label: 'Neutral' };
  };

  const { color, label } = getSentimentColor();

  const chartData = {
    labels: ['Sentiment', 'Remaining'],
    datasets: [
      {
        data: [normalizedSentiment, 100 - normalizedSentiment],
        backgroundColor: [color, 'rgba(100, 116, 139, 0.2)'],
        borderWidth: 0,
        circumference: 180,
        rotation: 270,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
  };

  return (
    <div className="glass-card p-4">
      <h3 className="font-semibold mb-4">Chat Sentiment</h3>
      <div className="relative h-32">
        <Doughnut data={chartData} options={options} />
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <span className="text-2xl font-bold" style={{ color }}>
            {(sentiment * 100).toFixed(0)}%
          </span>
          <span className="text-sm text-slate-400">{label}</span>
        </div>
      </div>
    </div>
  );
}

interface StatsCardProps {
  icon: string;
  label: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
  };
  gradient?: string;
}

export function StatsCard({ icon, label, value, change, gradient = 'from-indigo-500 to-purple-500' }: StatsCardProps) {
  return (
    <div className="stats-card">
      <div className={`stats-icon bg-gradient-to-br ${gradient}`}>
        <span className="text-xl">{icon}</span>
      </div>
      <div>
        <p className="text-sm text-slate-400">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold">{value}</p>
          {change && (
            <span
              className={`text-sm ${
                change.isPositive ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {change.isPositive ? '+' : ''}{change.value}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface RealTimeStatsProps {
  viewers: number;
  peakViewers: number;
  chatMessagesPerMinute: number;
  engagementScore: number;
}

export function RealTimeStats({ viewers, peakViewers, chatMessagesPerMinute, engagementScore }: RealTimeStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatsCard
        icon="👥"
        label="Live Viewers"
        value={viewers.toLocaleString()}
        gradient="from-indigo-500 to-purple-500"
      />
      <StatsCard
        icon="📈"
        label="Peak Viewers"
        value={peakViewers.toLocaleString()}
        gradient="from-orange-500 to-red-500"
      />
      <StatsCard
        icon="💬"
        label="Chat/min"
        value={chatMessagesPerMinute}
        gradient="from-cyan-500 to-blue-500"
      />
      <StatsCard
        icon="🔥"
        label="Engagement"
        value={`${engagementScore.toFixed(0)}%`}
        gradient="from-green-500 to-emerald-500"
      />
    </div>
  );
}

export function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="stats-card">
            <div className="skeleton w-12 h-12 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton-text w-16" />
              <div className="skeleton-text w-24 h-6" />
            </div>
          </div>
        ))}
      </div>
      <div className="glass-card p-4">
        <div className="skeleton-text w-32 mb-4" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    </div>
  );
}
