'use client'

import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: LucideIcon
  rightIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon: Icon, rightIcon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-mono text-gray-400 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          )}
          <input
            ref={ref}
            className={cn(
              'w-full px-4 py-3 bg-cyber-dark/50 border border-cyber-purple/30',
              'rounded-lg text-white placeholder-gray-500 font-mono',
              'focus:outline-none focus:border-cyber-blue focus:ring-1 focus:ring-cyber-blue',
              'transition-all duration-300',
              Icon && 'pl-11',
              rightIcon && 'pr-11',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-400 font-mono">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
