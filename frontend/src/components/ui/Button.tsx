'use client'

import { forwardRef } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'relative font-cyber font-bold uppercase tracking-wider rounded-lg overflow-hidden transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-gradient-to-r from-cyber-purple to-cyber-pink text-white hover:scale-105 hover:shadow-lg hover:shadow-cyber-purple/30',
      secondary: 'bg-gradient-to-r from-cyber-blue to-cyber-cyan text-white hover:scale-105 hover:shadow-lg hover:shadow-cyber-blue/30',
      outline: 'border border-cyber-blue text-cyber-blue hover:bg-cyber-blue/10',
      ghost: 'text-gray-400 hover:text-white hover:bg-cyber-purple/10',
      danger: 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:scale-105 hover:shadow-lg hover:shadow-red-500/30',
    }

    const sizes = {
      sm: 'px-4 py-2 text-xs',
      md: 'px-6 py-3 text-sm',
      lg: 'px-8 py-4 text-base',
    }

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          children
        )}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
