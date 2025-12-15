'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import {
  Bot, LogOut, Settings, Tv, Users, Zap, Activity,
  TrendingUp, MessageSquare, Bell, BarChart3
} from 'lucide-react'
import { authApi } from '@/lib/api'

interface User {
  id: string
  username: string
  email: string
  avatar?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = Cookies.get('auth_token')
    if (!token) {
      router.push('/login')
      return
    }

    // For demo purposes, set a mock user
    // In production, this would fetch from the API
    setUser({
      id: '1',
      username: 'SwanyStreamer',
      email: 'swany@example.com',
    })
    setIsLoading(false)
  }, [router])

  const handleLogout = () => {
    Cookies.remove('auth_token')
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Bot className="w-12 h-12 text-cyber-blue" />
        </motion.div>
      </div>
    )
  }

  const stats = [
    { icon: Users, label: 'Viewers', value: '2,847', change: '+12%', color: 'text-cyber-cyan' },
    { icon: TrendingUp, label: 'Followers', value: '15.2K', change: '+8%', color: 'text-cyber-pink' },
    { icon: MessageSquare, label: 'Chat Messages', value: '48.5K', change: '+24%', color: 'text-cyber-purple' },
    { icon: Activity, label: 'Stream Hours', value: '127h', change: '+5%', color: 'text-cyber-yellow' },
  ]

  const quickActions = [
    { icon: Tv, label: 'Go Live', description: 'Start streaming now', color: 'from-cyber-pink to-cyber-purple' },
    { icon: Zap, label: 'Automation', description: 'Manage workflows', color: 'from-cyber-blue to-cyber-cyan' },
    { icon: Bell, label: 'Alerts', description: 'Configure alerts', color: 'from-cyber-purple to-cyber-pink' },
    { icon: BarChart3, label: 'Analytics', description: 'View insights', color: 'from-cyber-cyan to-cyber-blue' },
  ]

  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="fixed left-0 top-0 bottom-0 w-64 bg-cyber-dark/90 border-r border-cyber-purple/30 backdrop-blur-sm z-50"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <Bot className="w-8 h-8 text-cyber-blue" />
            <span className="font-cyber text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyber-purple to-cyber-blue">
              SwanyBot
            </span>
          </div>

          <nav className="space-y-2">
            {[
              { icon: Activity, label: 'Dashboard', active: true },
              { icon: Tv, label: 'Streams' },
              { icon: Zap, label: 'Automation' },
              { icon: Bell, label: 'Alerts' },
              { icon: MessageSquare, label: 'Chat Bot' },
              { icon: BarChart3, label: 'Analytics' },
              { icon: Settings, label: 'Settings' },
            ].map((item) => (
              <motion.button
                key={item.label}
                whileHover={{ x: 4 }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-mono text-sm transition-all ${
                  item.active
                    ? 'bg-cyber-purple/20 text-cyber-blue border border-cyber-purple/30'
                    : 'text-gray-400 hover:text-white hover:bg-cyber-purple/10'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </motion.button>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-cyber-purple/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyber-purple to-cyber-pink flex items-center justify-center font-cyber font-bold">
              {user?.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-mono text-sm text-white">{user?.username}</p>
              <p className="font-mono text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all font-mono text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-cyber text-3xl font-bold text-white mb-2">
            Welcome back, <span className="text-cyber-cyan">{user?.username}</span>
          </h1>
          <p className="text-gray-400 font-mono">Here's what's happening with your streams</p>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="cyber-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                <span className="text-cyber-cyan text-xs font-mono">{stat.change}</span>
              </div>
              <p className="text-2xl font-cyber font-bold text-white mb-1">{stat.value}</p>
              <p className="text-gray-500 text-sm font-mono">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="font-cyber text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + index * 0.05 }}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="cyber-card p-6 text-left group cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-cyber font-bold text-white mb-1">{action.label}</h3>
                <p className="text-gray-500 text-sm font-mono">{action.description}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Recent activity placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="cyber-card p-6"
        >
          <h2 className="font-cyber text-xl font-bold text-white mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { time: '2 min ago', event: 'New follower: @viewer_123', type: 'follow' },
              { time: '5 min ago', event: 'Stream started: Gaming Session', type: 'stream' },
              { time: '1 hour ago', event: 'Alert triggered: Donation received', type: 'alert' },
              { time: '2 hours ago', event: 'Automation completed: Auto-reply bot', type: 'automation' },
            ].map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + index * 0.05 }}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-cyber-purple/10 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-cyber-cyan animate-pulse" />
                <div className="flex-1">
                  <p className="text-white text-sm font-mono">{activity.event}</p>
                  <p className="text-gray-500 text-xs font-mono">{activity.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  )
}
