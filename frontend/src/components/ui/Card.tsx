'use client'

import { forwardRef, HTMLAttributes } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'glow' | 'gradient'
  children: React.ReactNode
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const baseStyles = 'relative bg-cyber-dark/80 border border-cyber-purple/30 rounded-xl backdrop-blur-sm overflow-hidden'

    const variants = {
      default: '',
      glow: 'hover:border-cyber-blue/50 hover:shadow-lg hover:shadow-cyber-blue/20 transition-all duration-300',
      gradient: 'before:absolute before:inset-0 before:bg-gradient-to-br before:from-cyber-purple/10 before:to-transparent',
    }

    return (
      <motion.div
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      >
        <div className="relative z-10">{children}</div>
      </motion.div>
    )
  }
)

Card.displayName = 'Card'

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('p-6 border-b border-cyber-purple/20', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardHeader.displayName = 'CardHeader'

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('p-6', className)} {...props}>
        {children}
      </div>
    )
  }
)

CardContent.displayName = 'CardContent'

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('p-6 border-t border-cyber-purple/20', className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardContent, CardFooter }
