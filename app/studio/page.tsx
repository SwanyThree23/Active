'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/shared/Sidebar'
import { Header } from '@/components/shared/Header'
import { Card, Button, Input, Badge } from '@/components/ui'
import { useToast } from '@/app/providers'
import {
  Sparkles,
  Mic,
  Video,
  FileText,
  Wand2,
  Play,
  Pause,
  RefreshCw,
  Download,
  Copy,
  ChevronRight,
  Settings,
  Zap,
} from 'lucide-react'

const contentTypes = [
  { id: 'video', label: 'Video', icon: Video, description: 'AI avatar video content' },
  { id: 'audio', label: 'Audio', icon: Mic, description: 'Voice synthesized audio' },
  { id: 'text', label: 'Text', icon: FileText, description: 'Written content' },
]

const styles = ['professional', 'casual', 'educational', 'entertaining']

export default function StudioPage() {
  const { addToast } = useToast()
  const [contentType, setContentType] = useState('video')
  const [topic, setTopic] = useState('')
  const [style, setStyle] = useState('professional')
  const [duration, setDuration] = useState(60)
  const [generatedScript, setGeneratedScript] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('')
  const [step, setStep] = useState(1)

  async function handleGenerateScript() {
    if (!topic) {
      addToast({ title: 'Please enter a topic', type: 'error' })
      return
    }

    setIsGenerating(true)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/v1/claude/script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ topic, style, duration }),
      })

      if (res.ok) {
        const { data } = await res.json()
        setGeneratedScript(data.script)
        setStep(2)
        addToast({ title: 'Script generated successfully!', type: 'success' })
      } else {
        throw new Error('Failed to generate script')
      }
    } catch (error) {
      addToast({ title: 'Failed to generate script', type: 'error' })
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleCreateContent() {
    if (!generatedScript) {
      addToast({ title: 'Please generate a script first', type: 'error' })
      return
    }

    setIsGenerating(true)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/v1/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic,
          style,
          duration,
          type: contentType.toUpperCase(),
        }),
      })

      if (res.ok) {
        setStep(3)
        addToast({ title: 'Content created successfully!', type: 'success' })
      } else {
        throw new Error('Failed to create content')
      }
    } catch (error) {
      addToast({ title: 'Failed to create content', type: 'error' })
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedScript)
    addToast({ title: 'Copied to clipboard', type: 'success' })
  }

  return (
    <div className="min-h-screen bg-surface-950">
      <Sidebar />

      <main className="lg:pl-64">
        <Header title="AI Studio" />

        <div className="p-6">
          {/* Progress Steps */}
          <div className="flex items-center gap-4 mb-8">
            {['Generate Script', 'Customize', 'Produce'].map((label, i) => (
              <div key={label} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step > i + 1
                      ? 'bg-success-500 text-white'
                      : step === i + 1
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-700 text-surface-400'
                  }`}
                >
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span
                  className={
                    step === i + 1 ? 'text-surface-100' : 'text-surface-400'
                  }
                >
                  {label}
                </span>
                {i < 2 && <ChevronRight className="w-4 h-4 text-surface-600" />}
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Panel - Configuration */}
            <div className="lg:col-span-1 space-y-6">
              {/* Content Type */}
              <Card>
                <h3 className="text-lg font-semibold text-surface-100 mb-4">
                  Content Type
                </h3>
                <div className="space-y-3">
                  {contentTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setContentType(type.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all ${
                        contentType === type.id
                          ? 'border-primary-500 bg-primary-600/10'
                          : 'border-surface-700 hover:border-surface-600'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg ${
                          contentType === type.id
                            ? 'bg-primary-600/20 text-primary-400'
                            : 'bg-surface-700 text-surface-400'
                        }`}
                      >
                        <type.icon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-surface-100">{type.label}</p>
                        <p className="text-sm text-surface-400">{type.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>

              {/* Style Selection */}
              <Card>
                <h3 className="text-lg font-semibold text-surface-100 mb-4">Style</h3>
                <div className="grid grid-cols-2 gap-2">
                  {styles.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize transition-all ${
                        style === s
                          ? 'border-primary-500 bg-primary-600/10 text-primary-400'
                          : 'border-surface-700 text-surface-400 hover:border-surface-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </Card>

              {/* Duration */}
              <Card>
                <h3 className="text-lg font-semibold text-surface-100 mb-4">
                  Duration
                </h3>
                <div className="space-y-4">
                  <input
                    type="range"
                    min="30"
                    max="300"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full accent-primary-500"
                  />
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-400">30s</span>
                    <span className="text-primary-400 font-medium">{duration}s</span>
                    <span className="text-surface-400">5min</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Panel - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Topic Input */}
              <Card>
                <div className="flex items-center gap-3 mb-4">
                  <Wand2 className="w-5 h-5 text-primary-400" />
                  <h3 className="text-lg font-semibold text-surface-100">
                    What&apos;s your content about?
                  </h3>
                </div>
                <div className="space-y-4">
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter your topic or idea... e.g., 'How to use AI for content creation'"
                    className="w-full h-32 px-4 py-3 rounded-lg bg-surface-800 border border-surface-600 text-surface-100 placeholder-surface-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none resize-none"
                  />
                  <Button
                    onClick={handleGenerateScript}
                    isLoading={isGenerating}
                    leftIcon={<Sparkles className="w-4 h-4" />}
                    className="w-full"
                  >
                    Generate Script with AI
                  </Button>
                </div>
              </Card>

              {/* Generated Script */}
              {generatedScript && (
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-primary-400" />
                      <h3 className="text-lg font-semibold text-surface-100">
                        Generated Script
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyToClipboard}
                        leftIcon={<Copy className="w-4 h-4" />}
                      >
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleGenerateScript}
                        leftIcon={<RefreshCw className="w-4 h-4" />}
                      >
                        Regenerate
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-surface-800/50 border border-surface-700">
                    <pre className="whitespace-pre-wrap text-surface-200 font-mono text-sm">
                      {generatedScript}
                    </pre>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-700">
                    <div className="flex items-center gap-4 text-sm text-surface-400">
                      <span>~{Math.round(generatedScript.split(' ').length / 2.5)}s duration</span>
                      <span>~{generatedScript.split(' ').length} words</span>
                    </div>
                    <Button
                      onClick={handleCreateContent}
                      isLoading={isGenerating}
                      rightIcon={<ChevronRight className="w-4 h-4" />}
                    >
                      Continue to Customize
                    </Button>
                  </div>
                </Card>
              )}

              {/* Voice & Avatar Selection (Step 2) */}
              {step >= 2 && (
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <div className="flex items-center gap-3 mb-4">
                      <Mic className="w-5 h-5 text-primary-400" />
                      <h3 className="text-lg font-semibold text-surface-100">
                        Voice Selection
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {['Rachel', 'Josh', 'Sarah', 'Adam'].map((voice) => (
                        <button
                          key={voice}
                          onClick={() => setSelectedVoice(voice)}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                            selectedVoice === voice
                              ? 'border-primary-500 bg-primary-600/10'
                              : 'border-surface-700 hover:border-surface-600'
                          }`}
                        >
                          <span className="text-surface-100">{voice}</span>
                          <Play className="w-4 h-4 text-surface-400" />
                        </button>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <div className="flex items-center gap-3 mb-4">
                      <Video className="w-5 h-5 text-primary-400" />
                      <h3 className="text-lg font-semibold text-surface-100">
                        Avatar Selection
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {['avatar1', 'avatar2', 'avatar3', 'avatar4'].map((avatar) => (
                        <button
                          key={avatar}
                          onClick={() => setSelectedAvatar(avatar)}
                          className={`aspect-square rounded-lg border transition-all bg-surface-800 flex items-center justify-center ${
                            selectedAvatar === avatar
                              ? 'border-primary-500 ring-2 ring-primary-500/20'
                              : 'border-surface-700 hover:border-surface-600'
                          }`}
                        >
                          <Video className="w-8 h-8 text-surface-500" />
                        </button>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {/* Produce Button (Step 2) */}
              {step >= 2 && (
                <Card className="bg-gradient-to-r from-primary-600/20 to-accent-600/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-surface-100">
                        Ready to produce?
                      </h3>
                      <p className="text-surface-400 text-sm mt-1">
                        Your content will be generated using HeyGen avatars and ElevenLabs voice.
                      </p>
                    </div>
                    <Button
                      size="lg"
                      leftIcon={<Zap className="w-5 h-5" />}
                      onClick={() => {
                        setStep(3)
                        addToast({ title: 'Content production started!', type: 'success' })
                      }}
                    >
                      Produce Content
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
