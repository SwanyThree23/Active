'use client'

import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string | number
  status?: 'healthy' | 'degraded' | 'down'
  className?: string
}

export function MetricCard({ label, value, status, className }: MetricCardProps) {
  return (
    <div className={cn('flex items-center justify-between p-4 glass-light rounded-lg', className)}>
      <div className="flex items-center gap-3">
        {status && (
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              status === 'healthy' && 'bg-success-500 animate-pulse',
              status === 'degraded' && 'bg-primary-500',
              status === 'down' && 'bg-error-500'
            )}
          />
        )}
        <span className="text-sm text-surface-400">{label}</span>
      </div>
      <span className="font-medium text-surface-100">{value}</span>
    </div>
  )
}
