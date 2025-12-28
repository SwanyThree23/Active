'use client'

import { useState } from 'react'
import { Bell, Search, Menu } from 'lucide-react'
import { useAuth, useSocket } from '@/app/providers'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui'

interface HeaderProps {
  title?: string
  showSearch?: boolean
}

export function Header({ title, showSearch = true }: HeaderProps) {
  const { user } = useAuth()
  const { isConnected } = useSocket()
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <header className="sticky top-0 z-30 glass border-b border-surface-700/50">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: Title */}
        <div className="flex items-center gap-4">
          <button className="lg:hidden p-2 hover:bg-surface-800 rounded-lg">
            <Menu className="w-5 h-5 text-surface-400" />
          </button>
          {title && (
            <h1 className="text-xl font-bold text-surface-100">{title}</h1>
          )}
        </div>

        {/* Center: Search */}
        {showSearch && (
          <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search content, templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-800/50 border border-surface-700 text-surface-100 placeholder-surface-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none text-sm"
              />
            </div>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-success-500 animate-pulse' : 'bg-error-500'
              }`}
            />
            <span className="text-xs text-surface-400 hidden sm:inline">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Tier Badge */}
          {user?.tier && (
            <Badge
              variant={
                user.tier === 'enterprise'
                  ? 'primary'
                  : user.tier === 'pro'
                  ? 'success'
                  : 'default'
              }
            >
              {user.tier.toUpperCase()}
            </Badge>
          )}

          {/* Notifications */}
          <button className="relative p-2 hover:bg-surface-800 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-surface-400" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full" />
          </button>

          {/* Create Button */}
          <Button size="sm">
            Create Content
          </Button>
        </div>
      </div>
    </header>
  )
}
