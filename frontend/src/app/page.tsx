'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Zap, Shield, Tv, Bot } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-8">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 bg-cyber-purple/20 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          style={{ top: '10%', left: '10%' }}
        />
        <motion.div
          className="absolute w-80 h-80 bg-cyber-blue/20 rounded-full blur-3xl"
          animate={{
            x: [0, -80, 0],
            y: [0, 80, 0],
          }}
          transition={{ duration: 10, repeat: Infinity }}
          style={{ bottom: '10%', right: '10%' }}
        />
      </div>

      {/* Hero content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 text-center max-w-4xl"
      >
        {/* Logo */}
        <motion.div
          className="mb-8 inline-block"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <div className="flex items-center justify-center gap-4">
            <Bot className="w-16 h-16 text-cyber-blue" />
            <h1 className="font-cyber text-5xl md:text-7xl font-black">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-purple via-cyber-pink to-cyber-blue">
                SwanyBot
              </span>
              <span className="text-cyber-cyan"> Pro</span>
            </h1>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-xl md:text-2xl text-gray-400 mb-12 font-mono"
        >
          Ultimate Streaming Automation Platform
        </motion.p>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          {[
            { icon: Zap, label: 'Real-time', color: 'text-cyber-yellow' },
            { icon: Shield, label: 'Secure', color: 'text-cyber-cyan' },
            { icon: Tv, label: 'Multi-platform', color: 'text-cyber-pink' },
            { icon: Bot, label: 'AI-Powered', color: 'text-cyber-purple' },
          ].map((feature, index) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
              className="cyber-card p-4 flex flex-col items-center gap-2"
            >
              <feature.icon className={`w-8 h-8 ${feature.color}`} />
              <span className="text-sm font-mono text-gray-300">{feature.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link href="/signup">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="cyber-button w-full sm:w-auto"
            >
              <span>Get Started</span>
            </motion.button>
          </Link>
          <Link href="/login">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 border border-cyber-blue text-cyber-blue font-cyber font-bold uppercase tracking-wider rounded-lg hover:bg-cyber-blue/10 transition-all duration-300"
            >
              Sign In
            </motion.button>
          </Link>
        </motion.div>
      </motion.div>

      {/* Bottom decorative line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyber-purple via-cyber-pink to-cyber-blue"
      />
    </main>
  )
}
