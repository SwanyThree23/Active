'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Input, Card } from '@/components/ui'
import { useToast } from '@/app/providers'
import { Sparkles, Mail, Lock, User, ArrowRight, Github, Check } from 'lucide-react'

const benefits = [
  '10 free AI content generations',
  'Access to all templates',
  'Newsletter integration',
  'No credit card required',
]

export default function RegisterPage() {
  const router = useRouter()
  const { addToast } = useToast()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      if (res.ok) {
        const { data } = await res.json()
        localStorage.setItem('accessToken', data.accessToken)
        addToast({ title: 'Account created!', type: 'success' })
        router.push('/dashboard')
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Registration failed')
      }
    } catch (error) {
      addToast({
        title: 'Registration failed',
        description: error instanceof Error ? error.message : 'Please try again',
        type: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold text-surface-100">AI Content Studio</span>
            </Link>
            <h1 className="text-2xl font-bold text-surface-100">Create your account</h1>
            <p className="text-surface-400 mt-2">
              Start creating amazing AI-powered content today
            </p>
          </div>

          <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                leftIcon={<User className="w-4 h-4" />}
                required
              />

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                leftIcon={<Lock className="w-4 h-4" />}
                hint="At least 8 characters"
                required
              />

              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  required
                  className="mt-1 w-4 h-4 rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-surface-400">
                  I agree to the{' '}
                  <Link href="/terms" className="text-primary-400 hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-primary-400 hover:underline">
                    Privacy Policy
                  </Link>
                </span>
              </label>

              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Create Account
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-surface-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-surface-900 text-surface-400">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                leftIcon={
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                }
              >
                Google
              </Button>
              <Button variant="outline" leftIcon={<Github className="w-5 h-5" />}>
                GitHub
              </Button>
            </div>
          </Card>

          <p className="text-center text-surface-400 mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary-400 hover:text-primary-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Benefits */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-8 bg-gradient-to-br from-primary-600/20 to-accent-600/20">
        <div className="max-w-md">
          <h2 className="text-3xl font-bold text-surface-100 mb-6">
            Start creating with AI today
          </h2>
          <p className="text-surface-300 mb-8">
            Join 847+ creators who are already using AI Content Studio to produce amazing content.
          </p>

          <div className="space-y-4">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-success-500/20 text-success-400 flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-surface-200">{benefit}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 glass rounded-xl">
            <p className="text-surface-300 italic">
              &quot;AI Content Studio has completely transformed how we create content. What used to take days now takes minutes.&quot;
            </p>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-semibold">
                S
              </div>
              <div>
                <p className="font-medium text-surface-100">Sarah Chen</p>
                <p className="text-sm text-surface-400">Content Creator</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
