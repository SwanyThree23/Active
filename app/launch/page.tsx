'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/shared/Sidebar'
import { Header } from '@/components/shared/Header'
import { Card, Button, Badge } from '@/components/ui'
import { StatsCard } from '@/components/shared/StatsCard'
import {
  Rocket,
  Trophy,
  MessageSquare,
  TrendingUp,
  CheckCircle,
  Circle,
  Clock,
  Users,
  Target,
  Calendar,
  ArrowUp,
  ExternalLink,
} from 'lucide-react'

const launchChecklist = [
  {
    id: '1',
    title: 'Prepare Product Assets',
    description: 'Create compelling thumbnail, gallery images, and demo video',
    phase: 'pre-launch',
    completed: true,
  },
  {
    id: '2',
    title: 'Write Compelling Copy',
    description: 'Craft tagline, description, and first comment',
    phase: 'pre-launch',
    completed: true,
  },
  {
    id: '3',
    title: 'Build Hunter Network',
    description: 'Connect with hunters and schedule launch',
    phase: 'pre-launch',
    completed: false,
  },
  {
    id: '4',
    title: 'Notify Community',
    description: 'Alert supporters via email, social, and communities',
    phase: 'pre-launch',
    completed: false,
  },
  {
    id: '5',
    title: 'Schedule Social Posts',
    description: 'Prepare Twitter/X, LinkedIn, and other social announcements',
    phase: 'pre-launch',
    completed: false,
  },
]

const supporters = [
  { name: 'Alex Chen', votes: 12, avatar: 'A' },
  { name: 'Sarah Miller', votes: 8, avatar: 'S' },
  { name: 'John Doe', votes: 6, avatar: 'J' },
  { name: 'Emily Wang', votes: 5, avatar: 'E' },
  { name: 'Mike Johnson', votes: 4, avatar: 'M' },
]

const strategyPhases = [
  {
    phase: 'Pre-Launch',
    duration: '2-4 weeks',
    tasks: [
      'Build anticipation through teaser posts',
      'Gather email list of potential supporters',
      'Prepare all marketing materials',
      'Reach out to potential hunters',
    ],
  },
  {
    phase: 'Launch Day',
    duration: '24 hours',
    tasks: [
      'Post at optimal time (12:01 AM PST)',
      'Engage with every comment within 30 minutes',
      'Share hourly updates on social media',
      'Monitor ranking and competitor activity',
    ],
  },
  {
    phase: 'Post-Launch',
    duration: '1-2 weeks',
    tasks: [
      'Send thank you notes to supporters',
      'Analyze metrics and gather feedback',
      'Create case study of the launch',
      'Plan follow-up content and updates',
    ],
  },
]

export default function LaunchPage() {
  const [checklist, setChecklist] = useState(launchChecklist)

  const toggleChecklistItem = (id: string) => {
    setChecklist(
      checklist.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    )
  }

  const completedCount = checklist.filter((item) => item.completed).length
  const totalCount = checklist.length
  const progress = (completedCount / totalCount) * 100

  return (
    <div className="min-h-screen bg-surface-950">
      <Sidebar />

      <main className="lg:pl-64">
        <Header title="Launch Tools" />

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-6">
            <StatsCard
              title="Launch Status"
              value="Preparing"
              icon={<Rocket className="w-6 h-6" />}
              subtitle="2 weeks to go"
            />
            <StatsCard
              title="Checklist Progress"
              value={`${completedCount}/${totalCount}`}
              icon={<CheckCircle className="w-6 h-6" />}
              trend={{ value: Math.round(progress), label: 'complete' }}
            />
            <StatsCard
              title="Potential Supporters"
              value="156"
              icon={<Users className="w-6 h-6" />}
              trend={{ value: 12, label: 'this week' }}
            />
            <StatsCard
              title="Target Votes"
              value="500+"
              icon={<Target className="w-6 h-6" />}
              subtitle="Top 5 goal"
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Launch Checklist */}
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-surface-100">
                    Launch Checklist
                  </h3>
                  <p className="text-sm text-surface-400 mt-1">
                    Complete these tasks before your Product Hunt launch
                  </p>
                </div>
                <Badge variant="primary">{Math.round(progress)}% Complete</Badge>
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-surface-700 rounded-full mb-6 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="space-y-4">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-all cursor-pointer ${
                      item.completed
                        ? 'border-success-500/30 bg-success-500/5'
                        : 'border-surface-700 hover:border-surface-600'
                    }`}
                    onClick={() => toggleChecklistItem(item.id)}
                  >
                    <button
                      className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 transition-colors ${
                        item.completed
                          ? 'bg-success-500 border-success-500 text-white'
                          : 'border-surface-500 hover:border-primary-500'
                      }`}
                    >
                      {item.completed && (
                        <CheckCircle className="w-full h-full p-0.5" />
                      )}
                    </button>
                    <div className="flex-1">
                      <p
                        className={`font-medium ${
                          item.completed
                            ? 'text-surface-400 line-through'
                            : 'text-surface-100'
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="text-sm text-surface-400 mt-1">
                        {item.description}
                      </p>
                    </div>
                    <Badge variant="default" size="sm">
                      {item.phase}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Supporter Leaderboard */}
            <Card>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-surface-100">
                  Top Supporters
                </h3>
                <Trophy className="w-5 h-5 text-primary-400" />
              </div>

              <div className="space-y-4">
                {supporters.map((supporter, index) => (
                  <div
                    key={supporter.name}
                    className="flex items-center gap-4 p-3 rounded-lg bg-surface-800/50"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0
                          ? 'bg-primary-500 text-white'
                          : index === 1
                          ? 'bg-surface-400 text-surface-900'
                          : index === 2
                          ? 'bg-accent-600 text-white'
                          : 'bg-surface-700 text-surface-300'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-semibold">
                      {supporter.avatar}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-surface-100">{supporter.name}</p>
                      <p className="text-sm text-surface-400">
                        {supporter.votes} referrals
                      </p>
                    </div>
                    <ArrowUp className="w-5 h-5 text-success-500" />
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full mt-4">
                View All Supporters
              </Button>
            </Card>
          </div>

          {/* Strategy Guide */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <Target className="w-6 h-6 text-primary-400" />
              <h3 className="text-lg font-semibold text-surface-100">
                3-Phase Launch Strategy
              </h3>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {strategyPhases.map((phase, index) => (
                <div
                  key={phase.phase}
                  className="p-6 rounded-lg border border-surface-700 bg-surface-800/30"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary-600/20 text-primary-400 flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-surface-100">{phase.phase}</h4>
                      <p className="text-sm text-surface-400">{phase.duration}</p>
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {phase.tasks.map((task) => (
                      <li key={task} className="flex items-start gap-2 text-sm">
                        <Circle className="w-4 h-4 text-surface-500 mt-0.5 flex-shrink-0" />
                        <span className="text-surface-300">{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Actions */}
          <div className="flex items-center gap-4">
            <Button leftIcon={<ExternalLink className="w-4 h-4" />}>
              Preview on Product Hunt
            </Button>
            <Button variant="outline" leftIcon={<Calendar className="w-4 h-4" />}>
              Schedule Launch
            </Button>
            <Button variant="ghost" leftIcon={<Users className="w-4 h-4" />}>
              Invite Supporters
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
