'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: {
    value: number
    label: string
  }
  className?: string
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
}: StatsCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null
    if (trend.value > 0) return <TrendingUp className="w-4 h-4" />
    if (trend.value < 0) return <TrendingDown className="w-4 h-4" />
    return <Minus className="w-4 h-4" />
  }

  const getTrendColor = () => {
    if (!trend) return ''
    if (trend.value > 0) return 'text-success-400'
    if (trend.value < 0) return 'text-error-400'
    return 'text-surface-400'
  }

  return (
    <Card variant="hover" className={cn('', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-surface-400">{title}</p>
          <p className="text-2xl font-bold text-surface-100">{value}</p>
          {subtitle && (
            <p className="text-sm text-surface-400">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="p-3 rounded-lg bg-primary-600/20 text-primary-400">
            {icon}
          </div>
        )}
      </div>

      {trend && (
        <div className={cn('flex items-center gap-1 mt-4 text-sm', getTrendColor())}>
          {getTrendIcon()}
          <span>{Math.abs(trend.value)}%</span>
          <span className="text-surface-400">{trend.label}</span>
        </div>
      )}
    </Card>
  )
}
