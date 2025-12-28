'use client'

import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const variants = {
      default: 'bg-surface-700 text-surface-200 border-surface-600',
      primary: 'bg-primary-600/20 text-primary-400 border-primary-600/30',
      secondary: 'bg-accent-600/20 text-accent-400 border-accent-600/30',
      success: 'bg-success-500/20 text-success-400 border-success-500/30',
      warning: 'bg-primary-500/20 text-primary-400 border-primary-500/30',
      error: 'bg-error-500/20 text-error-400 border-error-500/30',
      outline: 'bg-transparent border-surface-500 text-surface-300',
    }

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-0.5 text-xs',
      lg: 'px-3 py-1 text-sm',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full font-medium border',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }
