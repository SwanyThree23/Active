'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui'
import {
  Sparkles,
  Mic,
  Video,
  Mail,
  Rocket,
  Zap,
  ArrowRight,
  Check,
  Play,
} from 'lucide-react'

const features = [
  {
    icon: Sparkles,
    title: 'AI Script Generation',
    description: 'Generate professional scripts with Claude AI in seconds',
  },
  {
    icon: Mic,
    title: 'Voice Synthesis',
    description: 'Convert text to natural speech with ElevenLabs voices',
  },
  {
    icon: Video,
    title: 'Avatar Videos',
    description: 'Create realistic AI avatar videos with HeyGen',
  },
  {
    icon: Mail,
    title: 'Newsletter Automation',
    description: 'Manage and distribute newsletters via Beehiiv',
  },
  {
    icon: Rocket,
    title: 'Launch Tools',
    description: 'Track and optimize your Product Hunt launches',
  },
  {
    icon: Zap,
    title: 'Workflow Automation',
    description: 'Connect all tools with N8N workflow orchestration',
  },
]

const integrations = [
  'Claude AI',
  'ElevenLabs',
  'HeyGen',
  'Descript',
  'Beehiiv',
  'Product Hunt',
  'WhisperFlow',
  'LLMLingua',
  'N8N',
]

const stats = [
  { value: '847+', label: 'Active Users' },
  { value: '12K+', label: 'Subscribers' },
  { value: '9', label: 'AI Integrations' },
  { value: '50%', label: 'Token Savings' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass border-b border-surface-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-lg text-surface-100">AI Content Studio</span>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/auth/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-600/20 text-primary-400 text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
              9 AI Integrations in One Platform
            </span>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-surface-100 mb-6">
              Create Stunning{' '}
              <span className="gradient-text">AI Content</span>
              <br />
              in Minutes
            </h1>

            <p className="text-xl text-surface-400 max-w-3xl mx-auto mb-10">
              The all-in-one platform for AI-powered content creation. Generate scripts,
              synthesize voices, create avatar videos, and automate your workflows.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link href="/auth/register">
                <Button size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                  Start Creating Free
                </Button>
              </Link>
              <Button variant="outline" size="lg" leftIcon={<Play className="w-5 h-5" />}>
                Watch Demo
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl font-bold gradient-text">{stat.value}</p>
                <p className="text-surface-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-surface-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-100 mb-4">
              Everything You Need to Create
            </h2>
            <p className="text-surface-400 max-w-2xl mx-auto">
              From script generation to video production, we&apos;ve got you covered
              with powerful AI tools.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="card card-hover"
              >
                <div className="p-3 w-fit rounded-lg bg-primary-600/20 text-primary-400 mb-4">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-surface-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-surface-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-surface-100 mb-4">
            Powered by Industry Leaders
          </h2>
          <p className="text-surface-400 max-w-2xl mx-auto mb-12">
            We integrate with the best AI services to deliver exceptional results.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            {integrations.map((integration) => (
              <div
                key={integration}
                className="px-6 py-3 glass-light rounded-full text-surface-300"
              >
                {integration}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="card text-center p-12 bg-gradient-to-br from-primary-600/20 to-accent-600/20">
            <h2 className="text-3xl sm:text-4xl font-bold text-surface-100 mb-4">
              Ready to Transform Your Content?
            </h2>
            <p className="text-surface-400 mb-8 max-w-xl mx-auto">
              Join 847+ creators already using AI Content Studio to produce amazing content.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link href="/auth/register">
                <Button size="lg">Start Free Trial</Button>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-surface-400">
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success-500" />
                No credit card required
              </span>
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success-500" />
                14-day free trial
              </span>
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success-500" />
                Cancel anytime
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-surface-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-surface-100">AI Content Studio</span>
          </div>

          <p className="text-surface-400 text-sm">
            &copy; {new Date().getFullYear()} AI Content Studio. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
