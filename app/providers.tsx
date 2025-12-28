'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'

// Auth Context
interface User {
  id: string
  email: string
  name: string | null
  role: string
  tier: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within Providers')
  }
  return context
}

// Socket Context
interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
})

export function useSocket() {
  return useContext(SocketContext)
}

// Toast Context
interface Toast {
  id: string
  title: string
  description?: string
  type: 'success' | 'error' | 'warning' | 'info'
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within Providers')
  }
  return context
}

// Combined Providers
export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  // Initialize auth state
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      setAccessToken(token)
      fetchUser(token)
    } else {
      setIsLoading(false)
    }
  }, [])

  // Initialize socket connection
  useEffect(() => {
    if (accessToken) {
      const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
        auth: { token: accessToken },
      })

      newSocket.on('connect', () => {
        setIsConnected(true)
      })

      newSocket.on('disconnect', () => {
        setIsConnected(false)
      })

      newSocket.on('notification', (notification) => {
        addToast({
          title: notification.title,
          description: notification.message,
          type: notification.type || 'info',
        })
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
      }
    }
  }, [accessToken])

  async function fetchUser(token: string) {
    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const { data } = await res.json()
        setUser(data)
      } else {
        localStorage.removeItem('accessToken')
        setAccessToken(null)
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function login(email: string, password: string) {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Login failed')
    }

    const { data } = await res.json()

    if (data.requires2FA) {
      throw new Error('2FA_REQUIRED')
    }

    localStorage.setItem('accessToken', data.accessToken)
    setAccessToken(data.accessToken)
    setUser(data.user)
  }

  function logout() {
    localStorage.removeItem('accessToken')
    setAccessToken(null)
    setUser(null)
    socket?.close()
    setSocket(null)
  }

  async function refreshToken() {
    try {
      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })

      if (res.ok) {
        const { data } = await res.json()
        localStorage.setItem('accessToken', data.accessToken)
        setAccessToken(data.accessToken)
      } else {
        logout()
      }
    } catch {
      logout()
    }
  }

  function addToast(toast: Omit<Toast, 'id'>) {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { ...toast, id }])

    setTimeout(() => {
      removeToast(id)
    }, 5000)
  }

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshToken }}>
      <SocketContext.Provider value={{ socket, isConnected }}>
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
          {children}
          <ToastContainer />
        </ToastContext.Provider>
      </SocketContext.Provider>
    </AuthContext.Provider>
  )
}

// Toast Container Component
function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            glass rounded-lg p-4 min-w-[300px] animate-in
            ${toast.type === 'success' ? 'border-success-500' : ''}
            ${toast.type === 'error' ? 'border-error-500' : ''}
            ${toast.type === 'warning' ? 'border-primary-500' : ''}
          `}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="font-medium text-surface-100">{toast.title}</p>
              {toast.description && (
                <p className="text-sm text-surface-400 mt-1">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-surface-400 hover:text-surface-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
